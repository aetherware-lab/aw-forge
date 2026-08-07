import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { email: string } | null;
  login: (email: string) => void;
  logout: () => void;
}

/**
 * Stub auth store. Real auth lands when the backend does; for now we just
 * stash the email in localStorage so refresh keeps you signed in.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (email) => set({ user: { email } }),
      logout: () => set({ user: null }),
    }),
    { name: 'cmat-auth' },
  ),
);
