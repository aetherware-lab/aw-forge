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
from app.config import STORAGE_DIR
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


@app.post("/extraction-runs")
async def create_extraction_run(
    background_tasks: BackgroundTasks,
    metadata: str = Form(..., description="JSON: {solicitation, name, docs}"),
    files: list[UploadFile] = File(...),
) -> dict:
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"metadata is not valid JSON: {exc}") from exc

    docs_by_filename = {d["filename"]: d["docId"] for d in meta.get("docs", [])}

    run_id = f"run-{uuid.uuid4().hex[:12]}"
    run_dir = STORAGE_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    sources: list[SourceFile] = []
    for upload in files:
        doc_id = docs_by_filename.get(upload.filename, upload.filename)
        dest = run_dir / upload.filename
        dest.write_bytes(await upload.read())
        sources.append(SourceFile(doc_id=doc_id, filename=upload.filename, path=str(dest)))

    if not sources:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

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
