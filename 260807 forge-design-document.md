# FORGE — Design Document

**FORGE** — Federal Opportunity Requirement GEnerator
**Client:** GCA (Government Contracting Authority)
**Last updated:** August 7, 2026

> **Scope change (Aug 2026):** FORGE no longer generates qualification matrices (QMats) or compliance matrices (CMats) — a separate downstream project now owns matrix generation and consumes FORGE's extracted requirement data. FORGE's job ends at producing structured, cited, confidence-scored **requirements** in the knowledge graph. It does not draft prospect-facing questions or produce any matrix/form output. Concretely: FORGE extracts stated requirements ("Contractor must be SAM registered"), not questions ("Are you SAM registered?"). This document has been updated throughout to reflect that narrower boundary — see §2 for current scope.

---

## 1. Problem Statement

GovCon proposal teams must manually extract qualification requirements from large, unstructured solicitation documents. This process is time-consuming, error-prone, and difficult to audit. Requirements are ambiguous, scattered across documents (Sections L, M, C, PWS, attachments, amendments), and must be traceable back to exact solicitation language.

LLMs can automate extraction, but are non-deterministic, liable to hallucinate, and non-verifiable — and LLM-generated citations can themselves be hallucinated. The core engineering question: how to build a deterministic, verifiable, low-hallucination-rate system for requirement extraction.

**Solution thesis:** Insert a graph database (knowledge graph) as an intermediary layer between solicitation documents and extracted output. The graph acts as a scaffold for LLM reasoning ("GraphRAG"), producing structured, citable requirements with confidence scores, contradiction detection, and full provenance back to source text. That structured requirement graph — not a generated document, matrix, or questionnaire — is FORGE's deliverable. Downstream systems, including a separate matrix-generation project, consume it.

---

## 2. Product Scope

FORGE is a **GraphRAG requirement extraction system**. It ingests government solicitation documents into a knowledge graph and extracts the requirements stated in those documents — with citations, confidence scores, and review metadata — organized in a per-solicitation document library.

FORGE extracts *requirements as stated in the solicitation* (e.g., "Contractor must be SAM registered"), not prospect-facing questions (e.g., "Are you SAM registered?"). Turning requirements into prospect questions, scoring matrices, or self-scoring questionnaires is **out of scope for FORGE** — that responsibility belongs to a separate downstream project, which consumes FORGE's extracted requirement data as its input.

FORGE is an **internal tool** (~12 users at GCA; users work independently and do not collaborate on documents). It may later be productized as a service, but productization is not a current design constraint.

### MVP scope

- PDF input only, English only
- Extraction of qualification requirements only, with citations and confidence scores
- One solicitation package per run

### Out of scope (for now)

- Qualification matrix (QMat) generation — owned by a separate downstream project
- Compliance matrix (CMat) generation — owned by a separate downstream project
- Data collection worksheet (DCW) generation
- Drafting prospect-facing questions, or any prospect-facing delivery (no hosted forms, no prospect accounts or token links)
- Full proposal writing
- Past performance narrative generation
- Price/volume integration
- Evaluation prediction
- Opportunity performance report (OPR) generation

### Future vision (aspirational)

Because solicitation requirements live in a knowledge graph, they can be compared against contractor profiles to automate business development: a **Leads** view (recommended prospect companies with match scores), a **Clients** view (profiles with NAICS codes, set-aside eligibility, capabilities, geographies), and an **Opportunities** view (SAM.gov opportunities auto-matched to client profiles, with automatic document pull and news sync). This BD/capture layer is aspirational and not part of the current build; it would consume FORGE's requirement graph the same way the downstream matrix-generation project does.

---

## 3. Users

- **Primary:** GCA proposal/BD staff. They register solicitations, upload documents, run extraction, review extracted requirements (with citations and confidence) in the Citations Table, and manage the per-solicitation document library.

FORGE has no prospect-facing user. Sending qualification questionnaires to prospects and collecting their responses belongs entirely to the downstream matrix-generation project — FORGE never generates a question, hosts a form, or issues a prospect access token.

---

## 4. Success Criteria

1. ≥90% of qualification requirements are identified (recall)
2. Every extracted requirement has a verifiable citation
3. A human reviewer can validate correctness in under 30 minutes
4. Extracted requirement data (schema, citations, confidence, review flags) is directly consumable by the downstream matrix-generation project without manual reformatting

**Hard constraints:**
- No hallucinated requirements
- All extracted data traceable to source text
- Must tolerate imperfect document structure
- Because downstream systems — including a compliance matrix that must be 100% correct — consume FORGE's requirement data, ambiguous or low-confidence extractions must be flagged for review rather than passed downstream silently

---

## 5. System Architecture

### 5.1 High-level diagram

```
Electron App (Windows / macOS)
        │
        │  HTTP (document upload, status polling)
        ▼
Python Cloud Server
  ├── docling-serve       (PDF parsing → chunks)
  ├── LangGraph pipeline  (requirement extraction)
  └── Neo4j driver        (graph reads/writes)
        │
        ▼
Neo4j  (Docker Compose in development · Aura in production)
        │
        ▼ (during extraction)
LLM API (external, called from the server)
        │
        ▼
Structured requirement graph (citations, confidence, review flags)
        │
        ▼ (export / scoped API access)
Downstream matrix-generation project (separate; out of scope for FORGE)
```

### 5.2 Guiding principles

- **Electron is a thin client.** All pipeline logic, API keys, and service calls live on the server. The client uploads documents, polls for status, and renders results. No local processing, Python, or database.
- **No native dependencies in the Electron app.** The app ships identically to Windows and macOS — no Python sidecar, no local database, no platform-specific build steps.
- **Documents persist.** Source documents are stored after ingestion; they back the per-solicitation document library and citation deep-links (Open in PDF).
- **Constrained extraction.** LLM extraction output is constrained to a predefined schema derived from a requirements ontology. This constraint is central to the anti-hallucination thesis.

### 5.3 Extraction pipeline

```
Solicitation documents (PDF)
        │
        ▼
   Parse & chunk        (Docling — section-aware, page/heading metadata)
        │
        ▼
   Extractor LLM        (requirements + citations as schema-constrained JSON)
        │
        ▼
   Validator            (JSON schema validation; retry loop back to the
        │                extractor or flag for manual review;
        │                contradiction screening)
        ▼
   Entity resolution    (dedupe near-identical entities)
        │
        ▼
   Neo4j graph          (nodes/edges with provenance properties
                          + built-in vector index)
```

The pipeline's terminal artifact is the graph itself — there is no generation step downstream of it (no matrix generator, no question drafter).

---

## 6. Component Design

### 6.1 Document parsing — Docling

- **Library:** `docling` (IBM, open source, MIT license), deployed as `docling-serve` on the Python cloud server.
- **Pipeline:** Standard pipeline. Handles programmatic PDFs; DOCX and other formats are supported natively by Docling.
- **Scanned PDFs:** In scope for the product, but VLM/OCR processing is post-MVP. The MVP pipeline should detect no-text-layer PDFs and fail gracefully with a clear message rather than silently extracting nothing.
- **Output:** Section-aware chunks with metadata (source, page number, heading hierarchy), fed directly into the extraction pipeline.
- **Provisioning note:** Pre-download layout and table structure model artifacts (`docling-tools models download`) during server provisioning to avoid cold-start delays.

### 6.2 Orchestration — LangGraph

LangGraph (Python) orchestrates the extraction pipeline, co-located with docling-serve on the server:

- **Extraction pipeline:** `load_document → chunk → extract → validate → resolve_entities → write_graph`, with the validator↔extractor retry loop implemented as conditional edges (validation failure → retry extraction or flag for manual review).
- LangGraph provides retries, parallelism across chunks, and an audit trail.

### 6.3 LLM strategy

- **Extraction:** Schema-constrained JSON output — the extractor is prompted to emit requirements, citations, and metadata conforming to the requirements ontology. Invalid outputs are retried or flagged.
- **Two-model pattern:** an Extractor LLM and a Validator/Verifier LLM.
- **Confidence scores:** produced by the extractor LLM as part of its prompt, informed by ambiguity, validation rules, and stated requirement frequency. Because LLM-self-reported confidence is uncalibrated, contradiction detection remains a deterministic graph-level check rather than relying on the LLM's score, and confidence bands should be checked against a ground-truth evaluation set.
- **Hybrid extraction:** for highly formulaic requirements (labor category qualifications, key personnel minimums, certifications such as CMMI/ISO), regex, keyword windows, and heading parsers can find content, with LLMs used only to interpret meaning.
- **API keys** live server-side only; they never touch the client.

### 6.4 Entity resolution

Deduplicate near-identical entities (e.g. "Dept. of Defense" vs "Department of Defense") using embedding similarity (`sentence-transformers`) plus string matching (`rapidfuzz`), implemented in the `resolve_entities` node.

### 6.5 Graph database — Neo4j

- **Development:** Neo4j 5.26 + APOC + GDS via Docker Compose (local).
- **Production:** Neo4j Aura (managed cloud). Connection is a URI + credentials; no local database distribution.
- **Vector index:** Neo4j's built-in vector index provides hybrid graph + semantic search — no separate vector database.
- **Driver:** `neo4j` Python driver on the server.

### 6.6 Validation, confidence & provenance

This layer is FORGE's core differentiator:

- **Contradiction detection:** graph-level validation screens for contradictory requirements (e.g. one clause requiring Secret clearance for all personnel while another requires Top Secret for the Site Lead). Contradictions lower confidence and raise review flags.
- **Confidence display:** color-coded bands — green ≥95%, lime 80–94%, amber 60–79%, orange 40–59%, red <40%.
- **Tiered review flags:** **Critical** (validated contradiction), **Important** (ambiguity on a high-impact clause), **Minor** (non-contradictory vagueness).
- **Citations:** every requirement carries at least one citation with file, section, and page. The Citation Drawer shows the verbatim source snippet with the matched clause highlighted, related citations, and an **Open in PDF** deep-link to the exact source location, so a reviewer can verify any extraction in seconds.

### 6.7 Output — structured requirements

FORGE's output is the requirement graph itself, not a generated document, matrix, or questionnaire. It's exposed two ways:

- **In-app review:** the Citations Table (§9) — one row per extracted requirement, with citation, confidence, and review flags — lets a GCA reviewer validate extraction quality.
- **Downstream consumption:** an export (format TBD — see §12) or scoped, read-only graph access lets the separate matrix-generation project pull extracted requirements, citations, confidence scores, and review flags without re-deriving them from source documents.

FORGE does not draft prospect-facing questions, generate SurveyJS or any other form/matrix output, or host anything for prospects to complete. Those responsibilities live entirely in the downstream project.

### 6.8 Server

- **Language:** Python — docling-serve, LangGraph pipeline, and the Neo4j driver in one service.
- **Hosting:** VPS (Hetzner, DigitalOcean, or Fly.io) — sufficient for ~12 users with the standard Docling pipeline.
- **Scaling:** Docling processes one document at a time per worker. If concurrent submissions become an issue, add a job queue (Redis + Celery or RQ); not needed initially.

### 6.9 Frontend — Electron

- **Platforms:** Windows and macOS. TypeScript / Node.js.
- **Role:** thin client — document upload, status polling, and rendering of the Citations Table and document library.

---

## 7. Requirements Ontology & Graph Schema

### 7.1 Ontology

FORGE's extraction is grounded in a **requirements ontology**: a controlled vocabulary of all qualification requirement types, each with indicator keywords and example text snippets, mapped to the solicitation sections where each type typically appears. The ontology will be derived from GCA's historical qualification and self-scoring matrices and a representative sample of past solicitations, capturing requirement types, repeated patterns, always-present vs. sometimes-present fields, scored vs. threshold requirements, and ambiguous/subjective requirements.

**Purpose:** the ontology defines the schema that constrains LLM extraction output. Instead of open-ended extraction, the extractor must classify each requirement into a known type and emit fields defined for that type — which is what makes the output structured, validatable, and resistant to hallucination.

**Function:** at extraction time, each chunk is processed against the ontology; the extractor emits schema-constrained JSON (requirement type, text, mandatory/scored status, expected evidence, citation), the validator checks it against the type's JSON schema, and valid output is written to the graph. Requirement typing operates on two axes: **modality** (Shall / Will / Should / May) and **category** (e.g. certifications, key personnel, past performance, clearances).

**Deep modeling:** the ontology and schema also capture relationships between requirements — dependency ("Requirement X depends on Requirement Y"), conditionality ("X only applies if Clause Z is active"), external origin ("X originates from regulation ABC §5.2"), and amendment versioning — via dedicated relationship types (e.g. `DEPENDS_ON`, `CONDITIONAL_ON`, `ORIGINATES_FROM`). This lets the graph represent requirement structure that naive entity-relation extraction would miss, and lets downstream consumers (including the matrix-generation project) reflect conditional applicability without re-deriving it.

### 7.2 Core graph schema

| Label | Description | Key Properties |
|---|---|---|
| `Solicitation` | Root document (RFP, RFQ, PWS) | `solicitation_number`, `title`, `agency`, `naics_code` |
| `Requirement` | A stated requirement | `id`, `text`, `source_ref`, `section`, `req_type`, `mandatory` |
| `Qualification` | Capability that satisfies a requirement | `id`, `text`, `qual_type`, `years_required`, `clearance_level` |
| `EvaluationFactor` | Section M evaluation criteria | `id`, `title`, `section`, `weight` |
| `RequirementCategory` | Grouping (Technical, Past Perf, etc.) | `name` |
| `DocumentChunk` | Section-level text block (citation anchor) | `id`, `text`, `source_file`, `section`, `section_title` |
| `Citation` | Exact provenance record for any extracted entity | `id`, `section`, `subsection`, `paragraph`, `verbatim_text`, `source_file` |

```
(Solicitation)-[:HAS_REQUIREMENT]->(Requirement)
(Solicitation)-[:HAS_EVAL_FACTOR]->(EvaluationFactor)
(Solicitation)-[:CONTAINS_CHUNK]->(DocumentChunk)

(Requirement)-[:BELONGS_TO_CATEGORY]->(RequirementCategory)
(Requirement)-[:SATISFIED_BY]->(Qualification)
(Requirement)-[:SOURCED_FROM]->(Citation)
(Requirement)-[:EVALUATED_BY]->(EvaluationFactor)

(Qualification)-[:DEMONSTRATES]->(Requirement)
(Qualification)-[:EVIDENCED_BY]->(Citation)

(Citation)-[:LOCATED_IN]->(DocumentChunk)
(DocumentChunk)-[:NEXT]->(DocumentChunk)
```

First-class `Citation` nodes carry exact provenance (section, subsection, paragraph, verbatim text, source file) and directly back the Citation Drawer UI.

### 7.3 Extension layer

A solicitation-entity extension layer broadens the graph for downstream consumption (e.g. by the matrix-generation project) and future opportunity matching:

- Nodes: `Agency`, `OfficeCode`, `ContractVehicle`, `NAICS`, `PSC`, `Deliverable`, `PeriodOfPerformance`, `Contractor`, `Incumbent`, `Amendment`, `Award`, `Location`
- Relationships: `ISSUED_BY`, `REQUIRES`, `AWARDED_TO`, `LOCATED_IN`, `REFERENCES`, `AMENDS`, `INCUMBENT_ON`

Shared nodes (`Solicitation`, `Requirement`) are the join points between the core schema and the extension layer. Node naming and ID conventions are unified across both so the extension can be layered on without migration.

---

## 8. Data Flow

1. User creates a Solicitation (title, SAM.gov URL → auto-extracted metadata: solicitation #, agency, notice type, response due date; custom tags) and uploads documents (RFP, PWS, attachments, amendments).
2. User opens the New Extraction Run modal, names it, selects source documents from the solicitation library (pre-checked), optionally adds files, and clicks **Run Extraction**.
3. Server parses documents via docling-serve → section-aware chunks with metadata.
4. The LangGraph extraction pipeline extracts requirements + citations per chunk (schema-constrained JSON), validates (retry loop), resolves entities, computes confidence, and detects contradictions.
5. Graph writes to Neo4j; node text is embedded into the Neo4j vector index.
6. UI renders the **Citations Table** — ID, section, requirement text, type pill, confidence bar, review flags, and citation links opening the Citation Drawer with Open-in-PDF verification.
7. The reviewer resolves flags and confirms extraction quality directly in the Citations Table.
8. Extracted requirement data (with citations, confidence, review flags) is made available to the downstream matrix-generation project via export or scoped graph access (§6.7, §12).
9. The Solicitation Page's News panel surfaces SAM.gov updates — amendments, response-date extensions, Q&A rounds, and new attachments — with manual sync.

---

## 9. UI / UX

**Screens:**

1. **Login** — email/password.
2. **Solicitations Dashboard** — tracked solicitations as uniform cards (title, solicitation #, agency, response due date, custom tags, pipeline progress bar with status line); search, tag/agency filters, and sort controls; **+ New Solicitation**.
3. **New Solicitation** — title, SAM.gov URL with metadata auto-extraction, solicitation #, agency, notice type, response due date, free-form tags with one-click suggestions, and drag-and-drop document upload.
4. **Solicitation Page** — header (title, number, agency, dates, tags, edit), pipeline bar, and two panels: a **Documents** library (grouped by type — source documents and requirement-extraction runs; pinning, search, filter, sort; version, requirement count, author metadata) and a **News from SAM.gov** feed (amendments, extensions, Q&A rounds, attachments; Sync now).
   - **New Extraction Run modal** (over the Solicitation Page): run title, source-document selection, additional uploads, **Run Extraction**.
5. **Citations Table** — one row per extracted requirement: ID, source section, requirement text, color-coded modality pill (Shall / Will / Should / May), confidence bar, tiered review flags, and inline citation links. Search plus Type / Section / Review filters. This is FORGE's terminal output screen.
   - **Citation Drawer** (right-side, over the table): citation label, the originating requirement with any review flag, the verbatim source snippet with the matched clause highlighted, source file/section/page, related citations, and **Open in PDF**.
   - **Export modal** (over the table): choose export format and which fields to include (citations, confidence, review flags), Download — or point to scoped API access for the downstream matrix-generation project to pull from directly.

---

## 10. Security, Privacy & Compliance

- **Solicitation documents:** public documents — no privacy concern in storing them.
- **Extracted requirement data:** derived entirely from public solicitation text; confidence scores and review flags are internal GCA work product but not independently sensitive. FORGE no longer collects prospect or client data directly (no forms, no prospect accounts) — that data, if any, lives in the downstream matrix-generation project.
- **Encryption in transit:** HTTPS everywhere (Let's Encrypt or managed hosting cert).
- **Encryption at rest:** enabled at the cloud provider.
- **Data residency:** choose a provider with region options if clients require it.
- **Legal/compliance:** DPA/ToS review is only relevant if FORGE's requirement export or graph access is exposed to an external party (e.g. a third-party-run downstream project); otherwise minimal legal surface for FORGE itself.
- **Credentials:** development defaults (e.g. the local Neo4j password) must never reach shared environments; production credentials are managed server-side.

---

## 11. Tech Stack Summary

| Layer | Choice |
|---|---|
| PDF parsing | Docling / `docling-serve` (standard pipeline; VLM/OCR post-MVP for scanned PDFs) |
| Orchestration | LangGraph — extraction pipeline incl. validator↔extractor retry loop |
| LLM client | `langchain-anthropic` or `langchain-openai` (provider undecided) |
| Extraction pattern | Schema-constrained JSON against the requirements ontology; Extractor + Validator LLMs |
| Entity resolution | `rapidfuzz` + `sentence-transformers` embeddings |
| Graph DB | Neo4j 5.26+ (APOC, GDS, built-in vector index) |
| Neo4j hosting | Docker Compose (development) → Neo4j Aura (production) |
| Server | Python service on a VPS (Hetzner / DigitalOcean / Fly.io) |
| Job queue | Deferred — Redis + Celery/RQ if concurrency requires it |
| Frontend | Electron (TypeScript) thin client, Windows + macOS |
| Requirement output | Structured requirement export (format TBD) and/or scoped Neo4j read access, for consumption by the downstream matrix-generation project |

---

## 12. Open Questions

- **LLM provider** — Anthropic vs OpenAI (or both, with a fallback policy).
- **Server framework** — FastAPI vs Flask for the Python API layer.
- **User authentication** — how users log in to the Electron app and authenticate to the server.
- **Extracted-data storage & retention** — retention policy for requirement/citation data in the graph, pending legal review (§10).
- **Requirement export format** — which format(s) FORGE exposes extracted requirements in for downstream consumption (JSON, CSV, direct Neo4j read access, etc.).
- **Downstream integration contract** — how the matrix-generation project actually pulls FORGE's data (pull-based export, webhook/push, or direct scoped Neo4j access), and how requirement-schema versioning is coordinated across the two projects.
- **Amendment/versioning model** — how requirement re-extraction runs against amended solicitations are represented in the graph and diffed against prior rounds.
- **Ground-truth evaluation set** — labeled solicitations for measuring the ≥90% recall target and calibrating LLM confidence bands.
- **Scanned-PDF handling** — detection and user messaging for no-text-layer PDFs in the MVP; VLM/OCR pipeline design post-MVP.
- **Neo4j Aura tier sizing** — production tier based on eventual graph size.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **FORGE** | Federal Opportunity Requirement GEnerator — this product |
| **GCA** | Government Contracting Authority — the client this project is built for |
| **QMat** | Qualification matrix — assesses whether a contractor/prospect meets solicitation qualification requirements. *Generated by a separate downstream project, not by FORGE; FORGE only supplies the underlying requirement data.* |
| **CMat** | Compliance matrix — tracks compliance with solicitation sections; must be 100% correct. *Generated by a separate downstream project, not by FORGE.* |
| **DCW** | Data collection worksheet — structured form for gathering response data. *Out of scope for FORGE.* |
| **GraphRAG** | Retrieval-augmented generation using a knowledge graph as the retrieval backend |
| **Chunk** | Section-aware text segment with metadata (page, heading, source) |
| **Citation** | Provenance record: file, section, subsection, paragraph, verbatim text |
| **Ontology** | Controlled vocabulary of requirement types, fields, indicators, and relationships that constrains extraction |
| **PWin** | Win-probability estimate informed by QMat scores. *A downstream-project concept; FORGE does not compute it.* |
| **Sections L / M / C** | Solicitation sections: instructions to offerors / evaluation factors / statement of work |
| **PWS** | Performance Work Statement |
| **CDRL** | Contract Data Requirements List |
| **SAM.gov** | US government contract opportunities portal (document source) |