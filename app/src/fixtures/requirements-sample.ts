import type { Requirement } from '@/types';

/**
 * Sample extraction-run content — mirrors the five requirements drawn on
 * Screen 5 of the wireframe. Until the GraphRAG backend is wired up, every
 * extraction run the user opens shows this same set so the screens have
 * real content to render.
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
