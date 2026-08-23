"""
FORGE server — thin FastAPI layer over the extraction pipeline.

Electron is a thin client per the design doc: this is the only thing it
talks to over HTTP (upload documents, poll run status, fetch results). No
local Python or database lives in the Electron app itself.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

from app import neo4j_client
from app.config import DOCUMENTS_DIR, STORAGE_DIR
from app.models import ExtractionRun, SourceFile
from app.pipeline import run_pipeline

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="FORGE")

# Single-user local desktop app — the Electron renderer calls this over
# localhost, so open CORS is fine; there's no untrusted origin to defend
# against here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/documents")
async def upload_documents(files: list[UploadFile] = File(...)) -> list[dict]:
    """Persist source documents independent of any extraction run, so they
    can be reused across runs instead of re-uploaded every time."""
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    results = []
    for upload in files:
        doc_id = f"doc-{uuid.uuid4().hex[:12]}"
        doc_dir = DOCUMENTS_DIR / doc_id
        doc_dir.mkdir(parents=True, exist_ok=True)
        content = await upload.read()
        (doc_dir / upload.filename).write_bytes(content)
        results.append({"docId": doc_id, "filename": upload.filename, "sizeBytes": len(content)})
    return results


def _resolve_stored_document(doc_id: str) -> tuple[str, bytes] | None:
    doc_dir = DOCUMENTS_DIR / doc_id
    if not doc_dir.is_dir():
        return None
    for path in doc_dir.iterdir():
        if path.is_file():
            return path.name, path.read_bytes()
    return None


@app.post("/extraction-runs")
async def create_extraction_run(
    background_tasks: BackgroundTasks,
    metadata: str = Form(..., description="JSON: {solicitation, name, docs}"),
    files: list[UploadFile] = File(default=[]),
) -> dict:
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"metadata is not valid JSON: {exc}") from exc

    docs = meta.get("docs", [])
    if not docs:
        raise HTTPException(status_code=400, detail="No documents were specified for this run.")

    uploads_by_filename = {upload.filename: upload for upload in files}

    run_id = f"run-{uuid.uuid4().hex[:12]}"
    run_dir = STORAGE_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    sources: list[SourceFile] = []
    for doc in docs:
        doc_id, filename = doc["docId"], doc["filename"]
        dest = run_dir / filename

        upload = uploads_by_filename.get(filename)
        if upload is not None:
            dest.write_bytes(await upload.read())
        else:
            stored = _resolve_stored_document(doc_id)
            if stored is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Document '{filename}' was not uploaded with this request "
                    "and isn't a previously stored document.",
                )
            _, content = stored
            dest.write_bytes(content)

        sources.append(SourceFile(doc_id=doc_id, filename=filename, path=str(dest)))

    if not sources:
        raise HTTPException(status_code=400, detail="No documents were resolved for this run.")

    sol = meta.get("solicitation", {})
    run = ExtractionRun(
        id=run_id,
        solicitation_number=sol.get("number", "UNKNOWN"),
        solicitation_title=sol.get("title", "Untitled Solicitation"),
        solicitation_agency=sol.get("agency", ""),
        name=meta.get("name", "New Extraction Run"),
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    neo4j_client.create_run(run)

    background_tasks.add_task(run_pipeline, run_id, sources)

    return {"id": run_id, "status": "pending"}


def _run_response(run: dict) -> dict:
    return {
        "id": run["id"],
        "name": run["name"],
        "status": run["status"],
        "error": run.get("error"),
        "createdAt": run["created_at"],
        "solicitationNumber": run["solicitation_number"],
        "solicitationTitle": run["solicitation_title"],
        "solicitationAgency": run["solicitation_agency"],
        "requirementCount": run["requirement_count"],
        # .get() with defaults: runs created before this field existed (or
        # not yet touched by the pipeline) won't have these properties set.
        "stage": run.get("stage"),
        "stageCurrent": run.get("stage_current", 0),
        "stageTotal": run.get("stage_total", 0),
    }


@app.get("/extraction-runs")
def list_extraction_runs() -> list[dict]:
    return [_run_response(r) for r in neo4j_client.list_runs()]


@app.get("/extraction-runs/{run_id}")
def get_extraction_run(run_id: str) -> dict:
    run = neo4j_client.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Extraction run not found.")
    return _run_response(run)


@app.get("/extraction-runs/{run_id}/requirements")
def get_extraction_run_requirements(run_id: str) -> list[dict]:
    run = neo4j_client.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Extraction run not found.")
    if run["status"] != "complete":
        return []
    return neo4j_client.get_requirements_for_run(run_id)


@app.on_event("shutdown")
def shutdown() -> None:
    neo4j_client.close_driver()
