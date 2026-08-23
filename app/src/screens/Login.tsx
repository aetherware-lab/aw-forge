import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';

const DETAIL_FADE_MS = 160;
const EXPAND_MS = 320;
const JUST_LOGGED_IN_KEY = 'forge-just-logged-in';

// Matches .app-card in global.css (max-width: 1200px) — the FLIP target
// approximates that floating card's footprint (not the full screen) so
// the sign-in card visibly grows *into* the workspace card rather than
// flattening to fill the viewport. The workspace card's real height is
// content-based and unknowable in advance, so this height is just "most
// of the space below the topbar" — close enough that the app-enter fade
// on the other side of the navigate() hides the final size mismatch.
const CARD_MAX_WIDTH = 1200;
const CARD_MARGIN = 24;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detailsHidden, setDetailsHidden] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const backdropRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || detailsHidden) return;

    // Step 1: fade out the card's own details (fields, copy) first, so the
    // card frame itself is what visibly grows in step 2.
    setDetailsHidden(true);

    const dialog = dialogRef.current;
    const backdropRect = backdropRef.current?.getBoundingClientRect();
    const bounds = backdropRect && {
      top: backdropRect.top + CARD_MARGIN,
      left: backdropRect.left + Math.max(CARD_MARGIN, (backdropRect.width - CARD_MAX_WIDTH) / 2),
      width: Math.min(backdropRect.width - CARD_MARGIN * 2, CARD_MAX_WIDTH),
      height: backdropRect.height - CARD_MARGIN * 2,
    };
    if (dialog && bounds) {
      // Pin the dialog to its current on-screen rect now, before anything
      // moves, so step 2 can FLIP it out toward the workspace card's shape.
      const rect = dialog.getBoundingClientRect();
      dialog.style.position = 'fixed';
      dialog.style.margin = '0';
      dialog.style.top = `${rect.top}px`;
      dialog.style.left = `${rect.left}px`;
      dialog.style.width = `${rect.width}px`;
      dialog.style.height = `${rect.height}px`;
      // Force layout so the pinned rect is committed before animating.
      void dialog.offsetHeight;

      window.setTimeout(() => {
        // Step 2: expand the (now detail-less) card toward the workspace
        // card's footprint.
        setExpanding(true);
        dialog.style.top = `${bounds.top}px`;
        dialog.style.left = `${bounds.left}px`;
        dialog.style.width = `${bounds.width}px`;
        dialog.style.height = `${bounds.height}px`;
      }, DETAIL_FADE_MS);
    }

    // Step 3: once the card's expanded, hand off to the app shell, which
    // fades the real workspace card in (see AppShell.tsx / app-enter).
    window.setTimeout(() => {
      try {
        sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1');
      } catch {
        /* sessionStorage unavailable — app shell just skips the fade-in */
      }
      login(email.trim());
      navigate('/solicitations', { replace: true });
    }, dialog && bounds ? DETAIL_FADE_MS + EXPAND_MS : 0);
  };

  return (
    <>
      <div className="chrome-bar">
        <span>forge.wsgc.local</span>
        <span aria-hidden="true">·</span>
      </div>
      <main className="auth-backdrop bg-grid" ref={backdropRef}>
        <form
          className={`auth-dialog${expanding ? ' auth-dialog--expand' : ''}`}
          ref={dialogRef}
          onSubmit={handleSubmit}
        >
          <div className={`auth-dialog-inner${detailsHidden ? ' is-hidden' : ''}`}>
            <div className="auth-dialog-top">
              <span className="auth-dialog-brand">FORGE</span>
              <span className="auth-dialog-sub">Sign in to continue</span>
            </div>

            <div className="auth-dialog-body">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@wsgc.us"
                autoComplete="email"
                autoFocus
                required
                disabled={detailsHidden}
              />

              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                disabled={detailsHidden}
              />
            </div>

            <div className="auth-dialog-bottom">
              <button type="submit" className="btn full" disabled={detailsHidden}>
                {expanding ? 'Signing in…' : 'Log In'}
              </button>
              <p className="muted">Prototype build — any email signs you in.</p>
            </div>
          </div>
        </form>
      </main>
    </>
  );
};

export default Login;
