// Domain types for FORGE. Loose where the wireframe is loose;
// will tighten as the GraphRAG backend lands.

export type SolicitationStatusTag =
  | 'hot'
  | 'warm'
  | 'tracking'
  | 'cold'
  | 'pinned'
  | 'rebid';

export type SolicitationTopicTag =
  | 'topic-cmmc'
  | 'topic-cyber'
  | 'topic-cloud'
  | 'topic-health'
  | 'topic-agency'
  | 'topic-draft'
  | 'topic-renewal'
  | 'topic-sources';

export type TagKey = SolicitationStatusTag | SolicitationTopicTag | string;

export type NoticeType =
  | 'Solicitation'
  | 'Sources Sought'
  | 'Pre-Solicitation'
  | 'Combined Synopsis/Solicitation'
  | 'Special Notice'
  | 'Award Notice';

export interface Solicitation {
  id: string;
  title: string;
  number: string;
  agency: string;
  responseDue: string; // ISO yyyy-mm-dd or 'TBD'
  noticeType: NoticeType;
  tags: TagKey[];
  /** Stage label shown above the progress bar. */
  stage: string;
  /** Pipeline progress 0..100 */
  progress: number;
  /** Optional URL the user pasted from SAM.gov */
  samUrl?: string;
  /** ISO yyyy-mm-dd this record was created in the app */
  createdAt: string;
}

export type DocumentType =
  | 'RFP'
  | 'PWS'
  | 'Attachment'
  | 'Amendment'
  | 'OPR'
  | 'Extraction Run'
  | 'Proposal';

export interface SolicitationDocument {
  id: string;
  solicitationId: string;
  name: string;
  type: DocumentType;
  /** Display sub-line: "Apr 22, 2026 · 47 requirements · Khoo" */
  sub: string;
  /** ISO yyyy-mm-dd for sort */
  dateAdded: string;
  pinned: boolean;
  /** Optional file-size label e.g. "4.2 MB" — rendered for source files */
  size?: string;
}

export type NewsKind = 'amend' | 'extend' | 'qa' | 'attach';

export interface NewsItem {
  id: string;
  solicitationId: string;
  kind: NewsKind;
  title: string;
  body: string;
  /** ISO datetime */
  postedAt: string;
}

export type RequirementType = 'shall' | 'will' | 'should' | 'may' | 'must';

export type FlagSeverity = 'critical' | 'important' | 'minor';

export interface Flag {
  severity: FlagSeverity;
  note: string;
}

export interface Citation {
  /** Display text e.g. "RFP p.47" or "PWS §C.5.1" */
  label: string;
  /** Source doc id this citation belongs to (for the drawer) */
  docId?: string;
  /** Optional page number for PDFs */
  page?: number;
  /** Exact source text, when the backend has it (real extraction runs only). */
  verbatimText?: string;
}

export interface Requirement {
  id: string;       // R-001
  section: string;  // L.3.2
  text: string;
  type: RequirementType;
  confidence: number; // 0..100
  citations: Citation[];
  flag?: Flag;
}

export interface ExtractionRun {
  id: string;
  solicitationId: string;
  name: string;
  generatedAt: string; // ISO datetime
  sourceDocIds: string[];
  requirements: Requirement[];
}

