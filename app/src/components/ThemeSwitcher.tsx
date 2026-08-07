import React from 'react';
import { useTheme } from '@/store/theme';
import { THEMES } from '@/themes';

interface Props {
  /** Visually label the control. Defaults to "Theme". */
  label?: string;
  /** Hide the label text and just show the select. */
  compact?: boolean;
}

/**
 * Theme picker. Adding a new theme is a single line in src/themes/index.ts
 * plus a CSS block in src/styles/tokens.css — this component renders the
 * registry automatically.
 */
const ThemeSwitcher: React.FC<Props> = ({ label = 'Theme', compact = false }) => {
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);

  return (
    <label className="theme-switcher">
      {!compact && <span>{label}</span>}
      <select
        value={themeId}
        onChange={(e) => setTheme(e.target.value)}
        aria-label="Theme"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default ThemeSwitcher;
