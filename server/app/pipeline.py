"""
The extraction pipeline, as a LangGraph state graph.

parse_documents -> extract -> validate -> generate. parse_documents and
extract write to Neo4j as they go (chunks as they're parsed, citations/
requirements per chunk) rather than in a batch at the end, so run progress
reflects real work done instead of only advancing at pipeline-node
boundaries.

`validate` is a placeholder — the design doc's real validate step
(contradiction screening across sections) is explicitly out of scope for
this MVP (single extraction run at a time, no automated review beyond what
the extractor itself flags). It still runs as a real, instant pipeline
stage so the shape matches the design doc and the UI always has something
honest to report. `resolve_entities` (cross-run dedup) is out of scope
entirely for now and isn't in this graph yet.

`generate` reports the run's final requirement count — the citations/
requirements themselves are already durably written by `extract`, so there's
no further Neo4j work here. Its total is only knowable now, once extraction
has actually finished (a chunk's requirement count isn't known ahead of
time — see `extract`), which is why it isn't reported any earlier.
"""

from __future__ import annotations

import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from app import neo4j_client
from app.docling_parse import parse_source_file
from app.extraction import extract_from_chunk
from app.models import Citation, DocumentChunk, Requirement, SourceFile

logger = logging.getLogger("forge.pipeline")


class PipelineState(TypedDict):
    run_id: str
    sources: list[SourceFile]
    chunks: list[DocumentChunk]
    requirements: list[Requirement]
    citations: list[Citation]


def parse_documents(state: PipelineState) -> PipelineState:
    run_id = state["run_id"]
    total = len(state["sources"])
    chunks: list[DocumentChunk] = []
    neo4j_client.set_run_progress(run_id, "parsing", 0, total)
    for i, source in enumerate(state["sources"], start=1):
        source_chunks = parse_source_file(source, run_id)
        neo4j_client.write_chunks(source_chunks)
        chunks.extend(source_chunks)
        neo4j_client.set_run_progress(run_id, "parsing", i, total)
    logger.info("parsed %d chunk(s) from %d document(s)", len(chunks), total)
    return {**state, "chunks": chunks}


def extract(state: PipelineState) -> PipelineState:
    """
    One Claude call per chunk. A single chunk failing (malformed structured
    output, a transient API error, whatever) must not throw away every other
    chunk's already-successful extraction — a ~50-chunk run is minutes of
    real API calls, and losing all of it over one bad chunk isn't acceptable.
    Failed chunks are logged and skipped; the run still completes with
    whatever it could extract.
    """
    run_id = state["run_id"]
    total = len(state["chunks"])
    requirements: list[Requirement] = []
    citations: list[Citation] = []
    failed_chunk_ids: list[str] = []
    dropped = 0
    neo4j_client.set_run_progress(run_id, "extracting", 0, total)
    for i, chunk in enumerate(state["chunks"], start=1):
        try:
            chunk_reqs, chunk_cites = extract_from_chunk(chunk)
        except Exception:
            logger.exception("extraction failed for chunk %s — skipping it", chunk.id)
            failed_chunk_ids.append(chunk.id)
            continue
        finally:
            neo4j_client.set_run_progress(run_id, "extracting", i, total)

        neo4j_client.write_citations(chunk_cites)
        # Source discipline: a requirement with no citation is a
        # hallucination risk per the design doc's hard constraints — don't
        # write it.
        sourced = [r for r in chunk_reqs if r.citation_ids]
        dropped += len(chunk_reqs) - len(sourced)
        neo4j_client.write_requirements(sourced)

        requirements.extend(sourced)
        citations.extend(chunk_cites)
    if failed_chunk_ids:
        logger.warning(
            "extraction failed for %d/%d chunk(s): %s",
            len(failed_chunk_ids), total, ", ".join(failed_chunk_ids),
        )
    if dropped:
        logger.warning("dropped %d requirement(s) with no citation", dropped)
    logger.info("extracted %d requirement(s), %d citation(s)", len(requirements), len(citations))
    return {**state, "requirements": requirements, "citations": citations}


def validate(state: PipelineState) -> PipelineState:
    """Placeholder — see module docstring. Runs as a real, instant stage so
    there's always a validating step for the UI to show, rather than
    silently skipping straight from extract to generate."""
    run_id = state["run_id"]
    neo4j_client.set_run_progress(run_id, "validating", 0, 1)
    logger.info("validation is not implemented yet — skipping")
    neo4j_client.set_run_progress(run_id, "validating", 1, 1)
    return state


def generate(state: PipelineState) -> PipelineState:
    """See module docstring — no Neo4j work left to do here, just reports
    the now-final requirement total."""
    run_id = state["run_id"]
    total = len(state["requirements"])
    neo4j_client.set_run_progress(run_id, "generating", 0, total)
    neo4j_client.set_run_progress(run_id, "generating", total, total)
    return state


def build_pipeline():
    graph = StateGraph(PipelineState)
    graph.add_node("parse_documents", parse_documents)
    graph.add_node("extract", extract)
    graph.add_node("validate", validate)
    graph.add_node("generate", generate)

    graph.set_entry_point("parse_documents")
    graph.add_edge("parse_documents", "extract")
    graph.add_edge("extract", "validate")
    graph.add_edge("validate", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


def run_pipeline(run_id: str, sources: list[SourceFile]) -> None:
    """Synchronous entry point — called from a FastAPI BackgroundTask."""
    neo4j_client.set_run_status(run_id, "running")
    try:
        pipeline = build_pipeline()
        pipeline.invoke({"run_id": run_id, "sources": sources, "chunks": [], "requirements": [], "citations": []})
        neo4j_client.set_run_status(run_id, "complete")
    except Exception as exc:  # noqa: BLE001 — surface any failure to the run record
        logger.exception("extraction run %s failed", run_id)
        neo4j_client.set_run_status(run_id, "error", error=str(exc))
