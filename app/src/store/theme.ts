import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { resolveTheme, type ThemeId } from '@/themes';

interface ThemeState {
  /** What the user picked — may be 'system'. */
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'system',
      setTheme: (id) => set({ themeId: id }),
    }),
    {
      name: 'forge-theme',
      version: 1,
      partialize: (s) => ({ themeId: s.themeId }),
    },
  ),
);

/**
 * Applies the resolved theme to <html data-theme>. Also subscribes to
 * prefers-color-scheme so that when 'system' is selected, flipping the
 * OS preference live-updates the app.
 *
 * Call once from the renderer entry point.
 */
export function installThemeEffect(): () => void {
  const apply = () => {
    const resolved = resolveTheme(useTheme.getState().themeId);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  };

  apply();

  const unsub = useTheme.subscribe(apply);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onMq = () => apply();
  // addEventListener is the modern API; older Safari needs addListener.
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else mq.addListener?.(onMq);

  return () => {
    unsub();
    if (mq.removeEventListener) mq.removeEventListener('change', onMq);
    else mq.removeListener?.(onMq);
  };
}
