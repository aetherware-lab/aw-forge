// ─────────────────────────────────────────────────────────────────────────────
// FORGE — Neo4j Schema
//
// Trimmed to the MVP's actual scope: extract requirements + citations from
// solicitation documents. No Qualification or EvaluationFactor nodes (those
// belong to matrix/scoring generation, which is the downstream project's
// job, not FORGE's) and no contradiction-detection or entity-resolution
// structures (explicitly descoped for the MVP — see design doc discussion).
//
// Run via: python scripts/init_schema.py
// ─────────────────────────────────────────────────────────────────────────────

// ── CONSTRAINTS (enforce uniqueness + auto-create lookup indexes) ────────────

CREATE CONSTRAINT solicitation_number IF NOT EXISTS
  FOR (s:Solicitation) REQUIRE s.solicitation_number IS UNIQUE;

CREATE CONSTRAINT chunk_id IF NOT EXISTS
  FOR (ch:DocumentChunk) REQUIRE ch.id IS UNIQUE;

CREATE CONSTRAINT citation_id IF NOT EXISTS
  FOR (c:Citation) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT requirement_id IF NOT EXISTS
  FOR (r:Requirement) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT category_name IF NOT EXISTS
  FOR (c:RequirementCategory) REQUIRE c.name IS UNIQUE;

CREATE CONSTRAINT extraction_run_id IF NOT EXISTS
  FOR (run:ExtractionRun) REQUIRE run.id IS UNIQUE;


// ── FULLTEXT INDEXES (keyword search over extracted text) ────────────────────

CREATE FULLTEXT INDEX requirement_text IF NOT EXISTS
  FOR (r:Requirement) ON EACH [r.text];

CREATE FULLTEXT INDEX chunk_text IF NOT EXISTS
  FOR (ch:DocumentChunk) ON EACH [ch.text];

CREATE FULLTEXT INDEX citation_text IF NOT EXISTS
  FOR (c:Citation) ON EACH [c.verbatim_text];


// ─────────────────────────────────────────────────────────────────────────────
// NODE PROPERTY REFERENCE (documentation only — not executed)
// ─────────────────────────────────────────────────────────────────────────────

/*
(:Solicitation {
  solicitation_number: "W912DY-26-R-0042",
  title:               "USACE CMMC Compliance Services",
  agency:              "USACE",
  naics_code:          "561621",
  response_due:        "2026-05-14"
})

(:ExtractionRun {
  id:              "run-abc123",             // == the frontend's SolicitationDocument id
  solicitation_number: "W912DY-26-R-0042",
  name:            "Extraction Run 1",
  status:          "pending",                // pending | running | complete | error
  error:           null,
  created_at:      "2026-08-07T12:00:00Z"
})

(:DocumentChunk {
  id:            "run-abc123-CHUNK-003",
  run_id:        "run-abc123",
  doc_id:        "doc-001",                  // frontend's local SolicitationDocument id for the source file
  source_file:   "RFP-W912DY-26-R-0042.pdf",
  section:       "L",
  section_title: "Section L — Instructions to Offerors",
  chunk_index:   3,
  text:          "raw section text..."
})

(:Citation {
  id:            "run-abc123-CIT-001",
  run_id:        "run-abc123",
  doc_id:        "doc-001",
  chunk_id:      "run-abc123-CHUNK-003",
  section:       "L",
  subsection:    "L.3.2",
  page:          47,
  verbatim_text: "The contractor shall maintain CMMC Level 2 certification..."
})

(:RequirementCategory {
  name: "Technical"   // Technical | Management | Past Performance | Price | Administrative | Small Business | Other
})

(:Requirement {
  id:         "run-abc123-REQ-001",
  run_id:     "run-abc123",
  section:    "L.3.2",
  text:       "The contractor shall maintain CMMC Level 2 certification throughout the period of performance.",
  type:       "shall",              // shall | will | should | may | must  (modality axis)
  confidence: 98,                   // 0..100, LLM-self-reported
  flag_severity: null,              // critical | important | minor | null
  flag_note:     null
})
*/


// ── RELATIONSHIPS ─────────────────────────────────────────────────────────────

/*
(Solicitation)-[:HAS_RUN]->(ExtractionRun)
(ExtractionRun)-[:CONTAINS_CHUNK]->(DocumentChunk)
(DocumentChunk)-[:NEXT]->(DocumentChunk)              // section order

(Requirement)-[:BELONGS_TO_RUN]->(ExtractionRun)
(Requirement)-[:BELONGS_TO_CATEGORY]->(RequirementCategory)
(Requirement)-[:SOURCED_FROM]->(Citation)             // every Requirement must have >=1

(Citation)-[:LOCATED_IN]->(DocumentChunk)

// Source discipline: a Requirement with no outgoing SOURCED_FROM edge is a
// hallucination risk and should never make it into the Citations Table.
*/
