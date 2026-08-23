"""
Pydantic schemas for FORGE's extraction pipeline.

Trimmed to the MVP's scope: a solicitation produces DocumentChunks, which
produce Citations, which source Requirements. No Qualification or
EvaluationFactor nodes — matrix/scoring generation is the downstream
project's job, not FORGE's.

`Requirement` and `Citation` are shaped to match the Electron frontend's
`types/index.ts` exactly (see app/src/types/index.ts), so the API layer can
pass them straight through with no reshaping.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

RequirementType = Literal["shall", "will", "should", "may", "must"]
FlagSeverity = Literal["critical", "important", "minor"]

RequirementCategory = Literal[
    "Technical",
    "Management",
    "Past Performance",
    "Price",
    "Administrative",
    "Small Business",
    "Other",
]

SectionCode = Literal["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "OTHER"]


class SourceFile(BaseModel):
    """One uploaded document, as handed to the pipeline by the Electron app."""

    doc_id: str = Field(description="The frontend's local SolicitationDocument id for this file.")
    filename: str
    path: str = Field(description="Absolute path to the saved file on disk.")


class DocumentChunk(BaseModel):
    id: str
    run_id: str
    doc_id: str
    source_file: str
    section: SectionCode
    section_title: str
    chunk_index: int
    text: str


class Flag(BaseModel):
    severity: FlagSeverity
    note: str


class Citation(BaseModel):
    """Matches the frontend's `Citation` interface once serialized (see `to_frontend`)."""

    id: str
    run_id: str
    doc_id: str
    chunk_id: str
    section: str = Field(
        description="Section/block/item reference as the solicitation itself labels it — "
        "letters (L, M), numbers (Item 11), or whatever scheme this document actually uses."
    )
    subsection: Optional[str] = None
    page: Optional[int] = None
    verbatim_text: str

    def label(self) -> str:
        if self.page is not None:
            return f"{self.section} p.{self.page}"
        if self.subsection:
            return f"{self.section} §{self.subsection}"
        return self.section

    def to_frontend(self) -> dict:
        return {
            "label": self.label(),
            "docId": self.doc_id,
            "page": self.page,
            "verbatimText": self.verbatim_text,
        }


class Requirement(BaseModel):
    """
    What the Extractor LLM must produce, one per stated requirement.

    This is also (module `citation_ids` aside) exactly the frontend's
    `Requirement` shape once `to_frontend()` resolves citation ids to full
    `Citation` objects.
    """

    id: str
    run_id: str
    section: str = Field(description="Solicitation section reference, e.g. 'L.3.2'.")
    text: str
    type: RequirementType = Field(description="Modality axis: shall/will/should/may/must.")
    category: Optional[RequirementCategory] = Field(
        default=None, description="Category axis, if the extractor could tell."
    )
    confidence: int = Field(ge=0, le=100)
    flag: Optional[Flag] = None
    citation_ids: list[str] = Field(
        default_factory=list,
        description="Must be non-empty — a Requirement with no citation is a hallucination risk.",
    )

    def to_frontend(self, citations_by_id: dict[str, Citation]) -> dict:
        return {
            "id": self.id,
            "section": self.section,
            "text": self.text,
            "type": self.type,
            "confidence": self.confidence,
            "flag": self.flag.model_dump() if self.flag else None,
            "citations": [
                citations_by_id[cid].to_frontend() for cid in self.citation_ids if cid in citations_by_id
            ],
        }


RunStatus = Literal["pending", "running", "complete", "error"]


class ExtractionRun(BaseModel):
    id: str
    solicitation_number: str
    solicitation_title: str
    solicitation_agency: str
    name: str
    status: RunStatus = "pending"
    error: Optional[str] = None
    created_at: str
    # Verbose progress, updated live by the pipeline (see pipeline.py) so the
    # UI can show more than just "running" — which stage, and how far
    # through it (e.g. "extracting requirements, chunk 7/23").
    stage: Optional[str] = None
    stage_current: int = 0
    stage_total: int = 0
