# FORGE Server

The Python side of FORGE: parses solicitation PDFs (Docling), extracts
requirements + citations via Claude, and writes them to Neo4j. The Electron
app is a thin client — it uploads files here and polls for results.

Trimmed to the MVP's actual scope, per current project decisions:

- **No Qualification or EvaluationFactor nodes.** FORGE extracts stated
  requirements only; turning those into qualification matrices, scoring, or
  prospect-facing questions is a separate downstream project's job.
- **No validation/contradiction-detection node, no entity resolution.**
  Single extraction run at a time, reviewed by one person. The extractor LLM
  still self-reports confidence and can flag an individual clause as
  ambiguous — it just doesn't cross-check requirements against each other or
  against prior runs.
- **No deployment story.** Single Windows user, run locally. Neo4j via
  Docker Compose, the API via `uvicorn` directly — no VPS, no Neo4j Aura, no
  job queue.

## Setup

**1. Neo4j:**

```powershell
cd server
docker compose up -d
```

Runs on ports 7475 (browser UI) / 7688 (bolt) — offset from Neo4j's usual
7474/7687 so this doesn't collide with any other Neo4j container you might
have running (e.g. an older prototype's `qmat-neo4j`).

**2. Python environment:**

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**3. Config:**

```powershell
copy .env.example .env
```

Edit `.env` and set `ANTHROPIC_API_KEY`. Everything else (parsing, Neo4j
writes, the API itself) works without it — only the actual extraction call
needs the key. Until it's set, `POST /extraction-runs` will run all the way
through parsing and then fail the run with a clear
`ANTHROPIC_API_KEY is not set` error, visible in the Electron app's Citations
Table instead of a silent hang.

**4. Apply the Neo4j schema** (constraints + indexes — run once, or again
after `docker compose down -v`):

```powershell
python scripts/init_schema.py
```

**5. Run the server:**

```powershell
uvicorn app.main:app --reload --port 8000
```

The Electron app expects it at `http://localhost:8000` (see
`app/src/lib/api.ts` on the frontend side).

## Endpoints

- `POST /extraction-runs` — multipart: a `metadata` JSON field
  (`{solicitation: {number, title, agency}, name, docs: [{docId, filename}]}`)
  plus one or more `files`. Saves the files under `storage/<run-id>/`, creates
  the run, and kicks off the pipeline as a background task. Returns
  `{id, status: "pending"}` immediately.
- `GET /extraction-runs/{id}` — `{id, status, error}`. Poll this until
  `status` is `complete` or `error`.
- `GET /extraction-runs/{id}/requirements` — once `complete`, the extracted
  requirements, already shaped to match the frontend's `Requirement` type
  (citations resolved inline, confidence/flags included).

## Pipeline

`app/pipeline.py` — a 4-node LangGraph graph. `parse_documents`/`extract`
write to Neo4j as they go (chunks as they're parsed, citations/requirements
per chunk, dropping any requirement with no citation) rather than batching
writes to the end, so run progress (`GET /extraction-runs/{id}`'s
`stage`/`stageCurrent`/`stageTotal`) reflects real work done, not just
pipeline-node boundaries:

```
parse_documents  (Docling: PDF -> section-aware chunks, written per document)
      |
   extract       (Claude, per chunk: schema-constrained Requirement + Citation, written per chunk)
      |
   validate      (placeholder — contradiction screening isn't implemented yet)
      |
   generate      (reports the final requirement count; writes already happened in extract)
```

Two things worth knowing before relying on this:

- **Section detection is a simple regex** over headings looking for
  `SECTION <letter>`. Verified against a real solicitation (see below) — its
  SF-1449 cover page correctly falls back to `"OTHER"` rather than guessing
  wrong, but expect real Section L/M/C headings to need more robust matching
  than this once you're looking at real extraction output. Tighten
  `_guess_section` in `app/docling_parse.py` if `"OTHER"` turns out to be
  common on content that should've matched.
- **Chunk granularity is fine — maybe too fine.** `HierarchicalChunker`
  produced 326 chunks from a single SF-1449 cover page of a real solicitation
  (verified with `docling` 2.118.0 against `W912PF26RA001_Solicitation.pdf`
  from the `prism` prototype) — it splits at roughly the table-cell level for
  tabular forms. That's 326 separate Claude calls for one page. Once the API
  key is back, watch actual extraction cost/latency and consider merging
  chunks up to the section level before calling `extract_from_chunk` if it's
  too fine-grained in practice.
- **Windows-specific gotcha already worked around:** Docling's layout model
  tries `torch.compile()` by default, which needs an MSVC compiler most
  Windows machines don't have — Docling treats that as fatal rather than
  falling back to eager execution. `app/docling_parse.py` sets
  `TORCHDYNAMO_DISABLE=1` before importing docling to avoid it. If you ever
  see `InvalidCxxCompiler` again, this is why.

## What's not here

Everything the design doc scoped as the downstream project's job (QMat/CMat/
DCW generation, scoring, prospect-facing delivery) — this server only ever
produces the requirement graph, never a matrix or a question.
