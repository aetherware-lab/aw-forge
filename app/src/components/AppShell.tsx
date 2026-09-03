import React, { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import UserMenu from './UserMenu';
import WindowControls from './WindowControls';
import NotificationCenter from './NotificationCenter';
import { IconClipboard, IconLayers } from '@/components/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ size?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/solicitations', label: 'Solicitations', icon: IconClipboard },
  { to: '/extraction-runs', label: 'Extraction Runs', icon: IconLayers },
];

const JUST_LOGGED_IN_KEY = 'forge-just-logged-in';
const GROW_MS = 320;
// Matches .auth-dialog's own max-width/min-height and .auth-backdrop's
// padding in global.css — the small, centered rect Login's card is
// sitting at (filled in with var(--surface), not resized — see
// Login.tsx) right before it hands off here. Recomputed independently
// rather than measured from Login (which has already unmounted by the
// time this runs) — it's simple, deterministic centering math against
// the current viewport, not something that can drift.
const AUTH_DIALOG_MAX_WIDTH = 452;
const AUTH_DIALOG_MIN_HEIGHT = 476;
const AUTH_BACKDROP_PADDING = 24;

/**
 * Outer chrome that wraps every authenticated route: a single topbar
 * (brand + primary nav + user menu) over a floating content card. There
 * is no sidebar — everything lives in this one bar.
 *
 * If Login just navigated here, the topbar drops in from above (see
 * app-enter/topbar-drop-in in global.css) and an entry overlay grows
 * directly from where Login's small card was sitting onto the real
 * .app-card — see the effect below — in one continuous motion, rather
 * than Login expanding to some intermediate size first. The real
 * .app-card renders normally the whole time (that's what's being
 * measured), but stays invisible (.is-entering, below) until the
 * overlay reaches it and disappears — otherwise the real card, being
 * far bigger than the overlay's small starting rect, would be visible
 * around/behind it from the very first frame instead of only being
 * revealed once the overlay has actually grown to cover it.
 *
 * Why measure the card here instead of predicting its size from Login:
 * earlier versions had Login estimate/measure a *clone* of the
 * destination before navigating, which kept quietly drifting from
 * reality (content height, scrollbar-driven width, font load timing —
 * any difference between the clone and the real thing showed up as a
 * mismatch). This measures the actual, already-rendered .app-card after
 * it mounts, so there's nothing left to predict.
 */
const AppShell: React.FC = () => {
  // The lazy useState initializer must stay pure — StrictMode
  // double-invokes it in dev, and an earlier version that removed the
  // sessionStorage flag *inside* the initializer had the first (discarded)
  // call consume the flag, so the second call always saw it already gone
  // and the animation never played. Read here, remove it below.
  const [justEntered] = useState(() => {
    try {
      return sessionStorage.getItem(JUST_LOGGED_IN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showEntryOverlay, setShowEntryOverlay] = useState(justEntered);
  const appCardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    try {
      sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    } catch {
      /* sessionStorage unavailable — nothing to clean up */
    }
    if (!showEntryOverlay) return;

    const card = appCardRef.current;
    const overlay = overlayRef.current;
    if (!card || !overlay) {
      setShowEntryOverlay(false);
      return;
    }

    // The real .app-card's actual rendered rect — not an estimate.
    const cardRect = card.getBoundingClientRect();

    // Start exactly where Login's small card was sitting: centered in
    // the viewport, same as .auth-backdrop's flex centering + padding.
    const startWidth = Math.min(window.innerWidth - AUTH_BACKDROP_PADDING * 2, AUTH_DIALOG_MAX_WIDTH);
    const startHeight = Math.min(window.innerHeight - AUTH_BACKDROP_PADDING * 2, AUTH_DIALOG_MIN_HEIGHT);
    overlay.style.top = `${(window.innerHeight - startHeight) / 2}px`;
    overlay.style.left = `${(window.innerWidth - startWidth) / 2}px`;
    overlay.style.width = `${startWidth}px`;
    overlay.style.height = `${startHeight}px`;
    // Commit that starting rect before animating — same technique as
    // Login.tsx's own FLIP (force a synchronous reflow, then change the
    // target styles from a setTimeout rather than requestAnimationFrame,
    // which can end up coalesced into the same frame as the commit above
    // and never actually get painted as a separate "before" state).
    void overlay.offsetHeight;

    const grow = window.setTimeout(() => {
      overlay.style.top = `${cardRect.top}px`;
      overlay.style.left = `${cardRect.left}px`;
      overlay.style.width = `${cardRect.width}px`;
      overlay.style.height = `${cardRect.height}px`;
    }, 20);

    const hide = window.setTimeout(() => setShowEntryOverlay(false), 20 + GROW_MS);
    return () => {
      window.clearTimeout(grow);
      window.clearTimeout(hide);
    };
    // Deliberately runs once on mount only — this is a one-shot entrance,
    // not something that should re-run as the route/content changes.
  }, []);

  return (
    <div className={`app-shell${justEntered ? ' app-enter' : ''}`}>
      <div className="chrome-bar topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <span className="topbar-brand-mark" aria-hidden="true">F</span>
            <span className="topbar-brand-name">FORGE</span>
          </div>
          <nav className="topbar-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
              >
                <span className="topbar-link-icon" aria-hidden="true">
                  <item.icon size={15} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-right chrome-right">
          <NotificationCenter />
          <UserMenu />
          <WindowControls />
        </div>
      </div>
      <main className="app-main bg-grid">
        <div className={`app-card${showEntryOverlay ? ' is-entering' : ''}`} ref={appCardRef}>
          <Outlet />
        </div>
      </main>
      {showEntryOverlay && <div className="app-entry-overlay" ref={overlayRef} aria-hidden="true" />}
    </div>
  );
};

export default AppShell;
