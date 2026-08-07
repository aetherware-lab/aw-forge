"""
Neo4j reads/writes for FORGE's extraction graph.

Write functions are MERGE-based and dependency-ordered (solicitation -> run ->
chunks -> citations -> requirements -> category edges), mirroring the pattern
in the graphrag-neo4j prototype's write_to_neo4j.py.
"""

from __future__ import annotations

from neo4j import GraphDatabase

from app.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER
from app.models import Citation, DocumentChunk, ExtractionRun, Requirement

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


def close_driver() -> None:
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def create_run(run: ExtractionRun) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MERGE (s:Solicitation {solicitation_number: $sol_number})
              ON CREATE SET s.title = $sol_title, s.agency = $sol_agency
            MERGE (run:ExtractionRun {id: $id})
              SET run.name = $name,
                  run.status = $status,
                  run.error = null,
                  run.created_at = $created_at
            MERGE (s)-[:HAS_RUN]->(run)
            """,
            id=run.id,
            sol_number=run.solicitation_number,
            sol_title=run.solicitation_title,
            sol_agency=run.solicitation_agency,
            name=run.name,
            status=run.status,
            created_at=run.created_at,
        )


def set_run_status(run_id: str, status: str, error: str | None = None) -> None:
    with get_driver().session() as session:
        session.run(
            "MATCH (run:ExtractionRun {id: $id}) SET run.status = $status, run.error = $error",
            id=run_id,
            status=status,
            error=error,
        )


def get_run(run_id: str) -> dict | None:
    with get_driver().session() as session:
        record = session.run(
            "MATCH (run:ExtractionRun {id: $id}) RETURN run", id=run_id
        ).single()
        return dict(record["run"]) if record else None


def write_chunks(chunks: list[DocumentChunk]) -> None:
    if not chunks:
        return
    with get_driver().session() as session:
        session.run(
            """
            UNWIND $chunks AS chunk
            MATCH (run:ExtractionRun {id: chunk.run_id})
            MERGE (ch:DocumentChunk {id: chunk.id})
              SET ch.run_id = chunk.run_id,
                  ch.doc_id = chunk.doc_id,
                  ch.source_file = chunk.source_file,
                  ch.section = chunk.section,
                  ch.section_title = chunk.section_title,
                  ch.chunk_index = chunk.chunk_index,
                  ch.text = chunk.text
            MERGE (run)-[:CONTAINS_CHUNK]->(ch)
            """,
            chunks=[c.model_dump() for c in chunks],
        )
        # Chain NEXT relationships in chunk_index order, per source file.
        session.run(
            """
            UNWIND $chunks AS chunk
            MATCH (a:DocumentChunk {id: chunk.id})
            MATCH (b:DocumentChunk {run_id: chunk.run_id, doc_id: chunk.doc_id,
                                     chunk_index: chunk.chunk_index + 1})
            MERGE (a)-[:NEXT]->(b)
            """,
            chunks=[c.model_dump() for c in chunks],
        )


def write_citations(citations: list[Citation]) -> None:
    if not citations:
        return
    with get_driver().session() as session:
        session.run(
            """
            UNWIND $citations AS cit
            MATCH (ch:DocumentChunk {id: cit.chunk_id})
            MERGE (c:Citation {id: cit.id})
              SET c.run_id = cit.run_id,
                  c.doc_id = cit.doc_id,
                  c.chunk_id = cit.chunk_id,
                  c.section = cit.section,
                  c.subsection = cit.subsection,
                  c.page = cit.page,
                  c.verbatim_text = cit.verbatim_text
            MERGE (c)-[:LOCATED_IN]->(ch)
            """,
            citations=[c.model_dump() for c in citations],
        )


def write_requirements(requirements: list[Requirement]) -> None:
    if not requirements:
        return
    with get_driver().session() as session:
        session.run(
            """
            UNWIND $reqs AS req
            MATCH (run:ExtractionRun {id: req.run_id})
            MERGE (r:Requirement {id: req.id})
              SET r.run_id = req.run_id,
                  r.section = req.section,
                  r.text = req.text,
                  r.type = req.type,
                  r.confidence = req.confidence,
                  r.flag_severity = CASE WHEN req.flag IS NULL THEN null ELSE req.flag.severity END,
                  r.flag_note = CASE WHEN req.flag IS NULL THEN null ELSE req.flag.note END
            MERGE (r)-[:BELONGS_TO_RUN]->(run)
            FOREACH (_ IN CASE WHEN req.category IS NULL THEN [] ELSE [1] END |
              MERGE (cat:RequirementCategory {name: req.category})
              MERGE (r)-[:BELONGS_TO_CATEGORY]->(cat)
            )
            WITH r, req
            UNWIND req.citation_ids AS cid
            MATCH (c:Citation {id: cid})
            MERGE (r)-[:SOURCED_FROM]->(c)
            """,
            reqs=[r.model_dump() for r in requirements],
        )


def orphaned_requirement_ids(run_id: str) -> list[str]:
    """Requirements with no SOURCED_FROM edge — a hallucination-risk signal."""
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (r:Requirement {run_id: $run_id})
            WHERE NOT (r)-[:SOURCED_FROM]->(:Citation)
            RETURN r.id AS id
            """,
            run_id=run_id,
        )
        return [record["id"] for record in result]


def get_requirements_for_run(run_id: str) -> list[dict]:
    """Returns frontend-shaped Requirement dicts (citations resolved inline)."""
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (r:Requirement {run_id: $run_id})
            OPTIONAL MATCH (r)-[:SOURCED_FROM]->(c:Citation)
            WITH r, c ORDER BY r.section, r.id
            RETURN r AS requirement, collect(c) AS citations
            """,
            run_id=run_id,
        )
        rows = []
        for record in result:
            req = dict(record["requirement"])
            citations = [dict(c) for c in record["citations"] if c is not None]
            rows.append(
                {
                    "id": req["id"],
                    "section": req["section"],
                    "text": req["text"],
                    "type": req["type"],
                    "confidence": req["confidence"],
                    "flag": (
                        {"severity": req["flag_severity"], "note": req["flag_note"]}
                        if req.get("flag_severity")
                        else None
                    ),
                    "citations": [
                        {
                            "label": (
                                f"{c['section']} p.{c['page']}"
                                if c.get("page") is not None
                                else (
                                    f"{c['section']} §{c['subsection']}"
                                    if c.get("subsection")
                                    else c["section"]
                                )
                            ),
                            "docId": c.get("doc_id"),
                            "page": c.get("page"),
                            "verbatimText": c.get("verbatim_text"),
                        }
                        for c in citations
                    ],
                }
            )
        return rows
