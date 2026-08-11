"""
The extraction pipeline, as a LangGraph state graph.

Trimmed to three nodes — parse_documents -> extract -> write_graph. The
design doc's full pipeline also has `validate` (contradiction screening) and
`resolve_entities` (cross-run dedup) nodes; both are explicitly out of scope
for this MVP (single extraction run at a time, no automated review beyond
what the extractor itself flags) and can be added as extra nodes later
without disturbing this shape.
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
    chunks: list[DocumentChunk] = []
    for source in state["sources"]:
        chunks.extend(parse_source_file(source, state["run_id"]))
    logger.info("parsed %d chunk(s) from %d document(s)", len(chunks), len(state["sources"]))
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
    requirements: list[Requirement] = []
    citations: list[Citation] = []
    failed_chunk_ids: list[str] = []
    for chunk in state["chunks"]:
        try:
            chunk_reqs, chunk_cites = extract_from_chunk(chunk)
        except Exception:
            logger.exception("extraction failed for chunk %s — skipping it", chunk.id)
            failed_chunk_ids.append(chunk.id)
            continue
        requirements.extend(chunk_reqs)
        citations.extend(chunk_cites)
    if failed_chunk_ids:
        logger.warning(
            "extraction failed for %d/%d chunk(s): %s",
            len(failed_chunk_ids), len(state["chunks"]), ", ".join(failed_chunk_ids),
        )
    logger.info("extracted %d requirement(s), %d citation(s)", len(requirements), len(citations))
    return {**state, "requirements": requirements, "citations": citations}


def write_graph(state: PipelineState) -> PipelineState:
    neo4j_client.write_chunks(state["chunks"])
    neo4j_client.write_citations(state["citations"])

    # Source discipline: a requirement with no citation is a hallucination
    # risk per the design doc's hard constraints — don't write it.
    sourced = [r for r in state["requirements"] if r.citation_ids]
    dropped = len(state["requirements"]) - len(sourced)
    if dropped:
        logger.warning("dropped %d requirement(s) with no citation", dropped)
    neo4j_client.write_requirements(sourced)

    return {**state, "requirements": sourced}


def build_pipeline():
    graph = StateGraph(PipelineState)
    graph.add_node("parse_documents", parse_documents)
    graph.add_node("extract", extract)
    graph.add_node("write_graph", write_graph)

    graph.set_entry_point("parse_documents")
    graph.add_edge("parse_documents", "extract")
    graph.add_edge("extract", "write_graph")
    graph.add_edge("write_graph", END)

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
