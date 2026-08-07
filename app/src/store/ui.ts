import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  /** Whether the primary sidebar is collapsed to icon-only width. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

/**
 * Cross-cutting UI preferences. Keep theme out of here — it has its own
 * store. Add new prefs (recent filters, last-opened pane, density) here.
 */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: 'cmat-ui',
      version: 1,
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
