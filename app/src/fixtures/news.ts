import type { NewsItem } from '@/types';

// SAM.gov news stream — mirrors Screen 4 of the wireframe for sol-001.
export const NEWS: NewsItem[] = [
  {
    id: 'news-001',
    solicitationId: 'sol-001',
    kind: 'amend',
    title: 'Amendment 0001 issued',
    body: 'Revised Section L language; new evaluation factor weighting added.',
    postedAt: '2026-04-23T08:14:00',
  },
  {
    id: 'news-002',
    solicitationId: 'sol-001',
    kind: 'extend',
    title: 'Response date extended',
    body: 'Due date moved from May 07 → May 14, 2026.',
    postedAt: '2026-04-21T16:02:00',
  },
  {
    id: 'news-003',
    solicitationId: 'sol-001',
    kind: 'qa',
    title: 'Q&A Round 1 posted',
    body: '12 questions answered; 3 affect Section C scope.',
    postedAt: '2026-04-18T11:30:00',
  },
  {
    id: 'news-004',
    solicitationId: 'sol-001',
    kind: 'attach',
    title: 'New attachment posted',
    body: 'CDRL A001 template added (Attachment-J.3).',
    postedAt: '2026-04-15T09:48:00',
  },

  // sol-002 — single recent item
  {
    id: 'news-010',
    solicitationId: 'sol-002',
    kind: 'qa',
    title: 'Q&A Round 1 posted',
    body: '8 questions answered; clarifies threat intel scope.',
    postedAt: '2026-04-19T14:20:00',
  },
];
