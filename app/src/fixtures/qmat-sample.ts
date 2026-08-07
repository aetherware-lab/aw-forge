import type { Question, Requirement } from '@/types';

/**
 * Sample QMat content — mirrors the five requirements drawn on Screen 5
 * of the wireframe. Until the GraphRAG sidecar is wired up, every QMat
 * the user opens shows this same set so the screens have real content
 * to render.
 */
export const SAMPLE_REQUIREMENTS: Requirement[] = [
  {
    id: 'R-001',
    section: 'L.3.2',
    text: 'The contractor shall maintain CMMC Level 2 certification throughout the period of performance.',
    type: 'shall',
    confidence: 98,
    citations: [
      { label: 'RFP p.47', docId: 'doc-001', page: 47 },
      { label: 'PWS §C.5.1', docId: 'doc-002' },
    ],
  },
  {
    id: 'R-002',
    section: 'L.3.3',
    text: 'Offeror shall provide past performance for three contracts of similar scope completed within the last five years.',
    type: 'shall',
    confidence: 92,
    citations: [{ label: 'RFP p.49', docId: 'doc-001', page: 49 }],
  },
  {
    id: 'R-003',
    section: 'M.2.1',
    text: 'Evaluation will consider technical approach, management plan, and price.',
    type: 'will',
    confidence: 74,
    citations: [{ label: 'RFP p.62', docId: 'doc-001', page: 62 }],
    flag: {
      severity: 'minor',
      note: 'Vague evaluation weighting; non-contradictory',
    },
  },
  {
    id: 'R-004',
    section: 'C.4.2',
    text: 'The contractor should provide monthly progress reports in accordance with CDRL A001.',
    type: 'should',
    confidence: 67,
    citations: [
      { label: 'PWS §C.4.2', docId: 'doc-002' },
      { label: 'CDRL A001' },
    ],
    flag: {
      severity: 'important',
      note: 'Ambiguous "should" clause; impacts CDRL deliverable scope',
    },
  },
  {
    id: 'R-005',
    section: 'C.6.1',
    text: 'All personnel shall possess Secret clearance or higher at contract award.',
    type: 'shall',
    confidence: 28,
    citations: [
      { label: 'PWS §C.6.1', docId: 'doc-002', page: 14 },
      { label: 'PWS §C.6.4', docId: 'doc-002', page: 16 },
    ],
    flag: {
      severity: 'critical',
      note: 'Contradicts §C.6.4 (Top Secret required for Site Lead) — graphrag validation conflict',
    },
  },
];

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'Q-001',
    requirementId: 'R-001',
    prompt: 'Does your organization currently hold an active CMMC Level 2 certification?',
    options: [
      { id: 'a', label: 'Yes — active certification in place' },
      { id: 'b', label: 'In progress — assessment scheduled or underway' },
      { id: 'c', label: 'Not yet — planning to pursue' },
      { id: 'd', label: 'No — need guidance on getting started' },
    ],
    detailHint: 'Follow-up: please share certifying body, certificate #, and expiration date…',
  },
  {
    id: 'Q-002',
    requirementId: 'R-002',
    prompt: 'How many completed contracts of comparable scope have you delivered in the last 5 years?',
    options: [
      { id: 'a', label: '3 or more — ready to share references' },
      { id: 'b', label: '1–2 — we have some but not three' },
      { id: 'c', label: 'None yet in this scope' },
      { id: 'd', label: "Unsure — let's discuss" },
    ],
    detailHint: 'Follow-up: customer name, contract #, POP, and CPARS or POC reference for each…',
  },
  {
    id: 'Q-003',
    requirementId: 'R-003',
    prompt: 'Do you have existing win themes, discriminators, or materials we should build from?',
    options: [
      { id: 'a', label: "Yes — I'll share templates & narratives" },
      { id: 'b', label: 'Partial — some ideas, help us refine' },
      { id: 'c', label: 'No — please draft from scratch' },
      { id: 'd', label: 'Not applicable / unsure' },
    ],
    detailHint: 'Follow-up: attach prior materials, pricing assumptions, or target price point…',
  },
  {
    id: 'Q-004',
    requirementId: 'R-004',
    prompt: 'Do you currently produce CDRL A001-compliant monthly progress reports?',
    options: [
      { id: 'a', label: 'Yes — I can share a sample' },
      { id: 'b', label: 'Informal only — not CDRL-compliant' },
      { id: 'c', label: 'No — please draft a reporting approach' },
      { id: 'd', label: 'Unsure — need to check with PM' },
    ],
    detailHint: 'Follow-up: attach a recent sample or describe your current reporting cadence…',
  },
  {
    id: 'Q-005',
    requirementId: 'R-005',
    prompt: 'How many of your proposed personnel currently hold Secret (or higher) clearance?',
    options: [
      { id: 'a', label: 'All proposed personnel are cleared' },
      { id: 'b', label: 'Most — a few need sponsorship' },
      { id: 'c', label: 'About half are cleared' },
      { id: 'd', label: 'Few/none — need a clearance plan' },
    ],
    detailHint: 'Follow-up: share clearance roster and sponsorship plan + timeline for uncleared candidates…',
  },
];

/**
 * Source snippets keyed by requirement id. Used by the Citation Drawer to
 * show the surrounding passage from the source document.
 */
export const SAMPLE_SOURCE_SNIPPETS: Record<string, { html: string; source: string }> = {
  'R-001': {
    html: '"…the contractor <strong>shall maintain CMMC Level 2 certification</strong> throughout the period of performance. Failure to maintain certification at any point shall be grounds for cure notice…"',
    source: '📄 RFP-W912DY-26-R-0042.pdf · §L.3.2 · p. 47',
  },
  'R-002': {
    html: '"Offeror <strong>shall provide past performance for three contracts of similar scope</strong> completed within the last five years. Provide CPARS or alternate evaluations where available…"',
    source: '📄 RFP-W912DY-26-R-0042.pdf · §L.3.3 · p. 49',
  },
  'R-003': {
    html: '"Evaluation <strong>will consider technical approach, management plan, and price</strong>. The relative importance of evaluation factors is established in Section M…"',
    source: '📄 RFP-W912DY-26-R-0042.pdf · §M.2.1 · p. 62',
  },
  'R-004': {
    html: '"The contractor <strong>should provide monthly progress reports</strong> in accordance with CDRL A001. Reports shall be delivered to the COR within five (5) working days following the end of the reporting period…"',
    source: '📄 PWS-Attachment-A.pdf · §C.4.2 · p. 9',
  },
  'R-005': {
    html: '"…all personnel <strong>shall possess Secret clearance or higher</strong> at contract award. The contractor shall maintain clearance throughout performance. A designated Site Lead shall additionally possess Top Secret clearance (§C.6.4)…"',
    source: '📄 PWS-Attachment-A.pdf · §C.6.1 · p. 14',
  },
};
