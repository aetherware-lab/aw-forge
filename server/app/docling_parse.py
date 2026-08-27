"""
PDF -> section-aware chunks, via Docling.

Docling's HierarchicalChunker groups text by heading; we additionally try to
pull a top-level solicitation section code (L, M, C, ...) out of the nearest
heading so DocumentChunk.section is populated. If nothing matches, the chunk
is tagged "OTHER" rather than guessed at — better to under-classify than to
silently mislabel a chunk.
"""

from __future__ import annotations

import os
import re

# Docling's layout model tries torch.compile() by default, which on Windows
# needs an MSVC compiler (`cl.exe`) most machines don't have installed —
# and Docling treats that failure as fatal rather than falling back to eager
# execution. Disabling TorchDynamo here (before torch is imported) makes it
# just run eager, which is plenty fast for single-document MVP use.
os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")

from app.models import DocumentChunk, SectionCode, SourceFile

# `docling.document_converter` drags in torch — ~30s alone (measured) —
# which made `uvicorn app.main:app` take 30+s just to start answering
# /health, since this module is imported eagerly via pipeline.py. Deferred
# to first actual use so the server binds instantly; only the first parse
# in a session pays the import cost.

_SECTION_RE = re.compile(r"\bSECTION\s+([A-M])\b", re.IGNORECASE)
_VALID_SECTIONS = set("ABCDEFGHIJKLM")

# HierarchicalChunker splits at roughly the table-cell/paragraph level, which
# for a tabular form like an SF-1449 means dozens of chunks per page — one
# LLM call per table cell. Merge consecutive raw chunks that share the same
# heading into a single, larger chunk before extraction, capping size so one
# very long section still gets split rather than producing one giant chunk.
_MAX_MERGED_CHARS = 6000


def _guess_section(heading_text: str) -> SectionCode:
    match = _SECTION_RE.search(heading_text)
    if match:
        letter = match.group(1).upper()
        if letter in _VALID_SECTIONS:
            return letter  # type: ignore[return-value]
    return "OTHER"


def _merge_raw_chunks(raw_chunks: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """[(heading, text), ...] -> merged [(heading, text), ...], same heading + size cap."""
    merged: list[tuple[str, str]] = []
    for heading, text in raw_chunks:
        text = text.strip()
        if not text:
            continue
        if (
            merged
            and merged[-1][0] == heading
            and len(merged[-1][1]) + len(text) + 1 <= _MAX_MERGED_CHARS
        ):
            prev_heading, prev_text = merged[-1]
            merged[-1] = (prev_heading, f"{prev_text}\n{text}")
        else:
            merged.append((heading, text))
    return merged


def parse_source_file(source: SourceFile, run_id: str) -> list[DocumentChunk]:
    from docling.document_converter import DocumentConverter
    from docling_core.transforms.chunker.hierarchical_chunker import HierarchicalChunker

    converter = DocumentConverter()
    result = converter.convert(source.path)
    document = result.document

    raw_chunks: list[tuple[str, str]] = []
    for chunk in HierarchicalChunker().chunk(document):
        headings = getattr(chunk.meta, "headings", None) or []
        heading_text = headings[-1] if headings else source.filename
        raw_chunks.append((heading_text, chunk.text))

    chunks: list[DocumentChunk] = []
    for index, (heading_text, text) in enumerate(_merge_raw_chunks(raw_chunks)):
        chunks.append(
            DocumentChunk(
                id=f"{run_id}-{source.doc_id}-CHUNK-{index:04d}",
                run_id=run_id,
                doc_id=source.doc_id,
                source_file=source.filename,
                section=_guess_section(heading_text),
                section_title=heading_text,
                chunk_index=index,
                text=text,
            )
        )
    return chunks
