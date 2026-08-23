/**
 * Theme registry.
 *
 * To add a new theme:
 *   1. Append a row to THEMES below.
 *   2. Add a `[data-theme="<your-id>"] { ... }` block in
 *      src/styles/tokens.css overriding the variables that differ.
 *   3. Optionally bump the version in src/store/theme.ts if you remove
 *      a theme id (so persisted selections don't point at nothing).
 */

export type ThemeId = string;

export interface ThemeOption {
  id: ThemeId;
  label: string;
  /** Short description shown beneath the label in the switcher. */
  hint?: string;
}

/**
 * `system` is a meta-theme that follows the OS preference. The actual
 * rendered theme it resolves to is either `light` or `dark`.
 */
export const THEMES: ThemeOption[] = [
  { id: 'system', label: 'System',  hint: 'Match OS preference' },
  { id: 'light',  label: 'Light',   hint: 'Default' },
  { id: 'dark',   label: 'Dark',    hint: 'Easier on the eyes' },
  { id: 'gca',    label: 'GCA',     hint: 'Greenline Capture brand' },
  { id: 'sam',    label: 'SAM',     hint: 'GSA design system' },
  { id: 'skeu',   label: 'Tactile', hint: 'Skeuomorphic bevels' },
];

/** Themes that produce a real CSS data-theme value (excludes 'system'). */
export const RENDERABLE_THEME_IDS: ThemeId[] = ['light', 'dark', 'gca', 'sam', 'skeu'];

/**
 * Resolves a stored theme id to the actual data-theme to apply on <html>.
 * 'system' becomes 'light' or 'dark' depending on prefers-color-scheme.
 */
export function resolveTheme(id: ThemeId): ThemeId {
  if (id !== 'system') return id;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
