import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CLIENT_PROFILES } from '@/fixtures/client-profiles';
import type { ClientProfile } from '@/types';

interface ClientsState {
  clients: ClientProfile[];
  add: (c: ClientProfile) => void;
  update: (id: string, patch: Partial<ClientProfile>) => void;
  remove: (id: string) => void;
}

/**
 * Persisted store for client/prospect profiles. Seeded from the fixtures
 * on first run so the matching engine has something to attribute against;
 * the Clients management screen adds, edits, and removes records.
 */
export const useClients = create<ClientsState>()(
  persist(
    (set) => ({
      clients: CLIENT_PROFILES,
      add: (c) => set((s) => ({ clients: [c, ...s.clients] })),
      update: (id, patch) =>
        set((s) => ({
          clients: s.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      remove: (id) =>
        set((s) => ({ clients: s.clients.filter((x) => x.id !== id) })),
    }),
    {
      name: 'cmat-clients',
      version: 1,
      partialize: (s) => ({ clients: s.clients }),
    },
  ),
);

export const newClientId = (): string =>
  `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
