"""
The one step that actually needs an Anthropic API key: turning a
DocumentChunk's raw text into schema-constrained Requirement + Citation
objects.

The LLM is only asked to decide the fields it can actually judge from a
single chunk (text, modality, category, confidence, flag, citation text) —
never ids, run_id, doc_id, or chunk_id, which it has no real basis for and
would otherwise waste attention inventing. Citations are linked to their
requirement within one response via a short-lived local `ref` string; real,
globally-unique ids get assigned afterward, once we're back in Python.

Each chunk is extracted independently (so LangGraph can eventually fan these
out in parallel).
"""

from __future__ import annotations

from typing import Optional

from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field

from app.config import ANTHROPIC_API_KEY, EXTRACTION_MODEL
from app.models import (
    Citation,
    DocumentChunk,
    Flag,
    Requirement,
    RequirementCategory,
    RequirementType,
    SectionCode,
)

EXTRACTION_SYSTEM_PROMPT = """\
You extract qualification requirements from a single section of a US federal \
government solicitation. You are a careful, literal reader — you do not infer, \
summarize across sections, or draft prospect-facing questions.

For every requirement stated in the text:

1. Text: restate the requirement in plain language, close to verbatim. Do not \
   soften or reinterpret government jargon.
2. Section: the most specific section/paragraph reference you can find for it \
   (e.g. "L.3.2"). If genuinely unavailable, use the section heading given to you.
3. Type (modality): "shall"/"must"/"will" for mandatory language, "should" for \
   recommended language, "may" for optional language.
4. Category (if clear from context): Technical, Management, Past Performance, \
   Price, Administrative, Small Business, or Other. Omit if you can't tell from \
   this section alone.
5. Confidence (0-100): how certain you are that this is a real, correctly-typed \
   requirement and not a boilerplate clause, a heading, or your own inference. \
   Lower confidence for vague or ambiguous language.
6. Flag (optional): if the clause is ambiguous, vague, or could be read more \
   than one way, set severity to "important" (ambiguity that affects scope) or \
   "minor" (vagueness that doesn't materially change scope), with a one-sentence \
   note explaining why. Leave unset for clear, unambiguous requirements. Do NOT \
   attempt to detect contradictions with other sections — you only see one \
   section at a time.
7. Citations: link each requirement to one or more citations via `citation_refs`,
   referring to the `ref` values you assign in the `citations` list.

For every citation, quote the EXACT verbatim source text (do not paraphrase)
and, if visible in the text you were given, a page number. Assign each
citation a short local `ref` (e.g. "c1", "c2") used only to link it to the
requirement(s) it supports within this response.

Rules:
- If you cannot point to specific text supporting a requirement, do not emit it.
- Do not extract from headers, footers, boilerplate certifications lists, or \
  tables of contents.
- Do not emit more than one requirement for the same sentence restated twice.
- If this section has no real requirements (e.g. it's a cover page), return \
  empty lists — that is a correct answer, not a failure.
"""


class ExtractedCitation(BaseModel):
    ref: str = Field(description="Short local id, e.g. 'c1', used only within this response.")
    section: SectionCode
    subsection: Optional[str] = None
    page: Optional[int] = None
    verbatim_text: str


class ExtractedRequirement(BaseModel):
    section: str
    text: str
    type: RequirementType
    category: Optional[RequirementCategory] = None
    confidence: int = Field(ge=0, le=100)
    flag: Optional[Flag] = None
    citation_refs: list[str] = Field(default_factory=list)


class ChunkExtraction(BaseModel):
    requirements: list[ExtractedRequirement] = Field(default_factory=list)
    citations: list[ExtractedCitation] = Field(default_factory=list)


def extract_from_chunk(chunk: DocumentChunk) -> tuple[list[Requirement], list[Citation]]:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Add it to server/.env and restart the server."
        )

    llm = ChatAnthropic(model=EXTRACTION_MODEL, api_key=ANTHROPIC_API_KEY, temperature=0)
    structured_llm = llm.with_structured_output(ChunkExtraction)

    result = structured_llm.invoke(
        [
            ("system", EXTRACTION_SYSTEM_PROMPT),
            (
                "human",
                f"Section heading: {chunk.section_title}\n"
                f"Source file: {chunk.source_file}\n\n"
                f"Section text:\n{chunk.text}",
            ),
        ]
    )
    assert isinstance(result, ChunkExtraction)

    citations: list[Citation] = []
    ref_to_id: dict[str, str] = {}
    for i, cit in enumerate(result.citations):
        citation_id = f"{chunk.id}-CIT-{i:03d}"
        ref_to_id[cit.ref] = citation_id
        citations.append(
            Citation(
                id=citation_id,
                run_id=chunk.run_id,
                doc_id=chunk.doc_id,
                chunk_id=chunk.id,
                section=cit.section,
                subsection=cit.subsection,
                page=cit.page,
                verbatim_text=cit.verbatim_text,
            )
        )

    requirements: list[Requirement] = []
    for i, req in enumerate(result.requirements):
        citation_ids = [ref_to_id[ref] for ref in req.citation_refs if ref in ref_to_id]
        requirements.append(
            Requirement(
                id=f"{chunk.id}-REQ-{i:03d}",
                run_id=chunk.run_id,
                section=req.section,
                text=req.text,
                type=req.type,
                category=req.category,
                confidence=req.confidence,
                flag=req.flag,
                citation_ids=citation_ids,
            )
        )

    return requirements, citations
