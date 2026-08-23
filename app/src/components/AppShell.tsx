import React, { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import UserMenu from './UserMenu';
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
// Matches .chrome-bar.topbar's height in global.css, and Login.tsx's own
// copy of the same constant.
const TOPBAR_H = 48;
const SHRINK_MS = 320;

/**
 * Outer chrome that wraps every authenticated route: a single topbar
 * (brand + primary nav + user menu) over a floating content card. There
 * is no sidebar — everything lives in this one bar.
 *
 * If Login just navigated here, the topbar drops in from above (see
 * app-enter/topbar-drop-in in global.css) and an entry overlay shrinks
 * down onto the real .app-card — see the effect below. Login's own half
 * of the transition (fade out the sign-in fields, then expand the card
 * to fill the screen below where the topbar will be) hands off to this
 * one at the exact same rect, so there's no visible jump at the seam.
 *
 * Why measure here instead of predicting the size from Login: earlier
 * versions had Login estimate/measure a *clone* of the destination
 * before navigating, which kept quietly drifting from reality (content
 * height, scrollbar-driven width, font load timing — any difference
 * between the clone and the real thing showed up as a mismatch). This
 * measures the actual, already-rendered .app-card after it mounts, so
 * there's nothing left to predict.
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

    // Start exactly where Login's expand left off: the full viewport
    // below the topbar, edge to edge.
    overlay.style.top = `${TOPBAR_H}px`;
    overlay.style.left = '0px';
    overlay.style.width = '100vw';
    overlay.style.height = `calc(100vh - ${TOPBAR_H}px)`;
    // Commit that starting rect before animating — same technique as
    // Login.tsx's own FLIP (force a synchronous reflow, then change the
    // target styles from a setTimeout rather than requestAnimationFrame,
    // which can end up coalesced into the same frame as the commit above
    // and never actually get painted as a separate "before" state).
    void overlay.offsetHeight;

    const shrink = window.setTimeout(() => {
      overlay.style.top = `${cardRect.top}px`;
      overlay.style.left = `${cardRect.left}px`;
      overlay.style.width = `${cardRect.width}px`;
      overlay.style.height = `${cardRect.height}px`;
    }, 20);

    const hide = window.setTimeout(() => setShowEntryOverlay(false), 20 + SHRINK_MS);
    return () => {
      window.clearTimeout(shrink);
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
          <UserMenu />
        </div>
      </div>
      <main className="app-main bg-grid">
        <div className="app-card" ref={appCardRef}>
          <Outlet />
        </div>
      </main>
      {showEntryOverlay && <div className="app-entry-overlay" ref={overlayRef} aria-hidden="true" />}
    </div>
  );
};

export default AppShell;
