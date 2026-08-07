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

from docling.document_converter import DocumentConverter
from docling_core.transforms.chunker.hierarchical_chunker import HierarchicalChunker

from app.models import DocumentChunk, SectionCode, SourceFile

_SECTION_RE = re.compile(r"\bSECTION\s+([A-M])\b", re.IGNORECASE)
_VALID_SECTIONS = set("ABCDEFGHIJKLM")


def _guess_section(heading_text: str) -> SectionCode:
    match = _SECTION_RE.search(heading_text)
    if match:
        letter = match.group(1).upper()
        if letter in _VALID_SECTIONS:
            return letter  # type: ignore[return-value]
    return "OTHER"


def parse_source_file(source: SourceFile, run_id: str) -> list[DocumentChunk]:
    converter = DocumentConverter()
    result = converter.convert(source.path)
    document = result.document

    chunks: list[DocumentChunk] = []
    for index, chunk in enumerate(HierarchicalChunker().chunk(document)):
        headings = getattr(chunk.meta, "headings", None) or []
        heading_text = headings[-1] if headings else source.filename
        chunks.append(
            DocumentChunk(
                id=f"{run_id}-{source.doc_id}-CHUNK-{index:04d}",
                run_id=run_id,
                doc_id=source.doc_id,
                source_file=source.filename,
                section=_guess_section(heading_text),
                section_title=heading_text,
                chunk_index=index,
                text=chunk.text,
            )
        )
    return chunks
