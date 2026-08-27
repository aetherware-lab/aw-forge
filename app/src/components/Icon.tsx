import React from 'react';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
}

/**
 * Dependency-free, Feather-style line-icon set. FORGE ships no icon
 * package — every icon here is a small inline SVG so the Electron bundle
 * stays free of a network-fetched font/icon dependency, and every icon
 * inherits `currentColor` so it follows text color (and therefore the
 * active theme) automatically.
 *
 * Usage: <IconSearch size={14} /> — same call shape for every icon below.
 */
function createIcon(displayName: string, children: React.ReactNode) {
  const IconComponent: React.FC<IconProps> = ({
    size = 16,
    strokeWidth = 1.75,
    ...rest
  }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
  IconComponent.displayName = displayName;
  return IconComponent;
}

export const IconClipboard = createIcon(
  'IconClipboard',
  <>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </>,
);

export const IconLayers = createIcon(
  'IconLayers',
  <>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </>,
);

export const IconSettings = createIcon(
  'IconSettings',
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>,
);

export const IconSearch = createIcon(
  'IconSearch',
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
);

export const IconStar = createIcon(
  'IconStar',
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
);

export const IconStarFilled: React.FC<IconProps> = ({ size = 16, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={1}
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconLogOut = createIcon(
  'IconLogOut',
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>,
);

export const IconPlus = createIcon(
  'IconPlus',
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
);

export const IconX = createIcon(
  'IconX',
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>,
);

export const IconFileText = createIcon(
  'IconFileText',
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </>,
);

export const IconUpload = createIcon(
  'IconUpload',
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>,
);

export const IconRefresh = createIcon(
  'IconRefresh',
  <>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>,
);

export const IconFlag = createIcon(
  'IconFlag',
  <>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </>,
);

export const IconChevronLeft = createIcon('IconChevronLeft', <polyline points="15 18 9 12 15 6" />);
export const IconChevronRight = createIcon('IconChevronRight', <polyline points="9 18 15 12 9 6" />);

export const IconAlertTriangle = createIcon(
  'IconAlertTriangle',
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>,
);

export const IconAlertCircle = createIcon(
  'IconAlertCircle',
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>,
);

export const IconInfo = createIcon(
  'IconInfo',
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>,
);

/** Plain checkmark — e.g. the success tick shown on Login while it pauses
 * after a successful sign-in, before the workspace card grows in. */
export const IconCheck = createIcon(
  'IconCheck',
  <polyline points="20 6 9 17 4 12" />,
);

/** Spinner arc — pair with the `.spin` CSS class (global.css) for rotation.
 * Used for in-progress states (e.g. an extraction run in flight). */
export const IconLoader = createIcon(
  'IconLoader',
  <circle cx="12" cy="12" r="9" strokeDasharray="42 14" strokeLinecap="round" />,
);

/** Frameless-titlebar window controls (WindowControls.tsx) — Windows'
 * conventional minimize/maximize/restore glyphs. */
export const IconWindowMinimize = createIcon('IconWindowMinimize', <line x1="5" y1="12" x2="19" y2="12" />);
export const IconWindowMaximize = createIcon(
  'IconWindowMaximize',
  <rect x="5.5" y="5.5" width="13" height="13" rx="1" />,
);
export const IconWindowRestore = createIcon(
  'IconWindowRestore',
  <>
    <rect x="7.5" y="7.5" width="11" height="11" rx="1" />
    <path d="M8 7.5V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1.5" />
  </>,
);

/** Radio-style dot used by the export-format picker. Not a real
 * <input type="radio"> since the row itself is the click target. */
export const IconRadio: React.FC<{ checked?: boolean; size?: number }> = ({
  checked = false,
  size = 14,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={1.75} />
    {checked && <circle cx="12" cy="12" r="4.5" fill="currentColor" />}
  </svg>
);
