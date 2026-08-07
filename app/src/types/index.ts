// Domain types for CMat Generator. Loose where the wireframe is loose;
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
  | 'QMat'
  | 'CMat'
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

export interface QMat {
  id: string;
  solicitationId: string;
  name: string;
  generatedAt: string; // ISO datetime
  sourceDocIds: string[];
  requirements: Requirement[];
}

export type QuestionAnswer = string | undefined;

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;            // Q-001
  requirementId: string; // R-005 — what this question is unblocking
  prompt: string;
  options: QuestionOption[];
  /** Free-text follow-up the prospect can fill in */
  detailHint?: string;
}

/* -----------------------------------------------------------------
 * Capture & matching — Feed page
 * ----------------------------------------------------------------- */

export interface ClientProfile {
  id: string;
  name: string;
  /** NAICS codes the client pursues, as 6-digit strings. */
  naics: string[];
  /** Set-aside eligibility (e.g. "8(a)", "SDVOSB", "WOSB", "HUBZone"). */
  setAsides: string[];
  /** Capability keywords matched against solicitation text. */
  capabilities: string[];
  /** Optional geographies of interest. */
  geographies?: string[];
}

/**
 * A solicitation surfaced by the matching engine, not yet tracked.
 * Visually similar to Solicitation but carries match metadata that
 * disappears once the user pulls it into their tracked list.
 */
export interface Recommendation {
  id: string;
  title: string;
  number: string;
  agency: string;
  responseDue: string;        // ISO yyyy-mm-dd or 'TBD'
  noticeType: NoticeType;
  /** 0..100. Higher = stronger match. */
  matchScore: number;
  /** Which client profile this recommendation is attributed to. */
  profileId: string;
  /** Human-readable reasons surfaced by the matcher. */
  matchedOn: string[];
  /** ISO datetime when this rec appeared in the feed. */
  postedAt: string;
  samUrl?: string;
  /** Optional tags carried over from SAM.gov metadata. */
  tags?: TagKey[];
}

/**
 * A prospect company surfaced as a potential new client — distinct from a
 * tracked ClientProfile. Lives in the Leads feed; the user can promote a
 * Lead into a ClientProfile via "Add as Client".
 */
export interface Lead {
  id: string;
  /** Company name */
  name: string;
  /** Sector / segment label, e.g. "Defense IT", "Health IT". */
  segment: string;
  /** Headquarters location, free-text. */
  hqLocation?: string;
  /** NAICS codes they primarily contract under. */
  naics: string[];
  /** Estimated annual federal contract spend, display string e.g. "$2M – $5M". */
  annualSpend?: string;
  /** Human-readable reasons surfaced by the matcher. */
  matchedOn: string[];
  /** 0..100. Strength of fit with the firm's offerings. */
  matchScore: number;
  /** ISO datetime when this lead surfaced. */
  surfacedAt: string;
  /** Data origin attribution. */
  source: 'SAM.gov' | 'GovWin' | 'USAspending' | 'Open Web';
  /** Optional public URL (company site, SAM profile, etc.). */
  url?: string;
  /** Optional capability keywords the lead is known to deliver. */
  capabilities?: string[];
}
