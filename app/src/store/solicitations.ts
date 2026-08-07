import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NewsItem, Solicitation, SolicitationDocument } from '@/types';
import { SOLICITATIONS } from '@/fixtures/solicitations';
import { DOCUMENTS } from '@/fixtures/documents';
import { NEWS } from '@/fixtures/news';

/** qmatId -> { questionId -> selected option id } */
type AnswerMap = Record<string, Record<string, string>>;
/** qmatId -> { questionId -> follow-up free text } */
type FollowupMap = Record<string, Record<string, string>>;

interface SolicitationsState {
  solicitations: Solicitation[];
  documents: SolicitationDocument[];
  news: NewsItem[];

  /** Prospect answers, keyed by qmatId then questionId */
  answers: AnswerMap;
  /** Free-text follow-ups, same shape */
  followups: FollowupMap;

  /** Mutations */
  add: (sol: Solicitation, initialDocs?: SolicitationDocument[]) => void;
  update: (id: string, patch: Partial<Solicitation>) => void;
  remove: (id: string) => void;
  addDocument: (doc: SolicitationDocument) => void;
  togglePin: (docId: string) => void;
  setAnswer: (qmatId: string, questionId: string, optionId: string) => void;
  setFollowup: (qmatId: string, questionId: string, text: string) => void;
}

/**
 * Solicitations store. Components should subscribe to raw arrays
 * (s => s.solicitations) and filter in useMemo — selectors that return
 * derived arrays trigger re-renders on every store touch.
 *
 * Only data is persisted, not the actions, so rehydration from localStorage
 * doesn't wipe out method references.
 */
export const useSolicitations = create<SolicitationsState>()(
  persist(
    (set) => ({
      solicitations: SOLICITATIONS,
      documents: DOCUMENTS,
      news: NEWS,
      answers: {},
      followups: {},

      add: (sol, initialDocs = []) =>
        set((s) => ({
          solicitations: [sol, ...s.solicitations],
          documents: [...s.documents, ...initialDocs],
        })),

      update: (id, patch) =>
        set((s) => ({
          solicitations: s.solicitations.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        })),

      remove: (id) =>
        set((s) => ({
          solicitations: s.solicitations.filter((x) => x.id !== id),
          documents: s.documents.filter((d) => d.solicitationId !== id),
          news: s.news.filter((n) => n.solicitationId !== id),
        })),

      addDocument: (doc) =>
        set((s) => ({ documents: [...s.documents, doc] })),

      togglePin: (docId) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === docId ? { ...d, pinned: !d.pinned } : d,
          ),
        })),

      setAnswer: (qmatId, questionId, optionId) =>
        set((s) => ({
          answers: {
            ...s.answers,
            [qmatId]: { ...(s.answers[qmatId] ?? {}), [questionId]: optionId },
          },
        })),

      setFollowup: (qmatId, questionId, text) =>
        set((s) => ({
          followups: {
            ...s.followups,
            [qmatId]: { ...(s.followups[qmatId] ?? {}), [questionId]: text },
          },
        })),
    }),
    {
      name: 'cmat-solicitations',
      // Bump when the persisted shape changes so dev sessions don't get
      // stuck on stale data.
      version: 3,
      partialize: (s) => ({
        solicitations: s.solicitations,
        documents: s.documents,
        news: s.news,
        answers: s.answers,
        followups: s.followups,
      }),
    },
  ),
);

/** Tiny id helper — replace with crypto.randomUUID() when wired to a backend. */
export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
