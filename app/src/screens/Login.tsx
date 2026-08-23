import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import Dashboard from '@/screens/Dashboard';

const DETAIL_FADE_MS = 160;
const EXPAND_MS = 320;
const JUST_LOGGED_IN_KEY = 'forge-just-logged-in';

// Matches AppShell's layout exactly (see global.css): a 48px topbar, then
// .app-main's 24px padding around a max-1200px-wide .app-card. .app-card
// is sized to its own content (not a fixed rect), so top/left/width here
// are exact geometry but height is measured, not assumed — see the
// hidden Dashboard clone below and its use in handleSubmit.
const TOPBAR_H = 48;
const CARD_MARGIN = 24;
const CARD_MAX_WIDTH = 1200;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatStatusClock = (d: Date): string =>
  `${d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [detailsHidden, setDetailsHidden] = useState(false);
  const [expanding, setExpanding] = useState(false);
  // No real backend yet — login() always succeeds today, so this can never
  // actually flip true. It's wired up so a rejected login (once real auth
  // exists) has somewhere to land without further UI work.
  const [loginFailed, setLoginFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const backdropRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  // measureMainRef mimics .app-main's own box (including its
  // overflow-y: auto) around measureCardRef's .app-card, so that if the
  // real content is tall enough to need a scrollbar, this clone gets one
  // too — a real vertical scrollbar narrows the content area by ~15px,
  // which changes wrapping (tag pills, meta text) and therefore height.
  // Measuring .app-card alone, unconstrained, undercounts exactly that
  // case — which is why the previous version only mismatched once
  // content was tall enough to actually need scrolling.
  const measureMainRef = useRef<HTMLDivElement>(null);
  const measureCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isValid = EMAIL_RE.test(email.trim()) && password.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || detailsHidden) return;
    setLoginFailed(false);

    // Step 1: fade out the card's own details (fields, copy) first, so the
    // card frame itself is what visibly grows in step 2.
    setDetailsHidden(true);

    const dialog = dialogRef.current;
    const backdropRect = backdropRef.current?.getBoundingClientRect();
    let bounds: { top: number; left: number; width: number; height: number } | null = null;
    if (backdropRect) {
      const top = backdropRect.top + TOPBAR_H + CARD_MARGIN;
      const availableHeight = backdropRect.height - TOPBAR_H - CARD_MARGIN * 2;

      // Measure the hidden Dashboard clone inside an .app-main-shaped box
      // sized exactly like the real one, so wrapping/line-breaks (and any
      // scrollbar-driven width narrowing) match and both dimensions are
      // real rather than guessed. Width in particular used to be a plain
      // arithmetic Math.min — correct only when .app-main has no
      // scrollbar; once one appears (content taller than the viewport)
      // the real .app-card is actually narrower than that formula
      // assumed, which is why width silently stopped matching too.
      let width = Math.min(backdropRect.width - CARD_MARGIN * 2, CARD_MAX_WIDTH); // fallback if refs aren't ready
      let height = availableHeight;
      const measureMain = measureMainRef.current;
      const measureCard = measureCardRef.current;
      if (measureMain && measureCard) {
        measureMain.style.width = `${backdropRect.width}px`;
        measureMain.style.height = `${backdropRect.height - TOPBAR_H}px`;
        void measureMain.offsetHeight; // force layout before reading it back
        const measured = measureCard.getBoundingClientRect();
        width = measured.width;
        height = Math.min(availableHeight, measured.height);
      }

      const left = backdropRect.left + Math.max(CARD_MARGIN, (backdropRect.width - width) / 2);
      bounds = { top, left, width, height };
    }
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

    // Step 3: once the card's reached the workspace card's footprint, hand
    // off to the app shell, whose topbar drops in from above over the
    // fading-in workspace (see AppShell.tsx / app-enter).
    window.setTimeout(() => {
      try {
        sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1');
      } catch {
        /* sessionStorage unavailable — app shell just skips the animation */
      }
      login(email.trim());
      navigate('/solicitations', { replace: true });
    }, dialog && bounds ? DETAIL_FADE_MS + EXPAND_MS : 0);
  };

  return (
    <main className="auth-backdrop bg-grid" ref={backdropRef}>
      <form
        className={`auth-dialog${expanding ? ' auth-dialog--expand' : ''}`}
        ref={dialogRef}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={`auth-dialog-inner${detailsHidden ? ' is-hidden' : ''}`}>
          <div className="auth-dialog-top">
            <span className="auth-dialog-brand">FORGE</span>
          </div>

          <div className="auth-dialog-body">
            <div className="auth-form-card">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={loginFailed ? 'input-error' : undefined}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginFailed(false);
                }}
                placeholder="you@wsgc.us"
                autoComplete="email"
                autoFocus
                disabled={detailsHidden}
                aria-invalid={loginFailed}
              />

              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={loginFailed ? 'input-error' : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginFailed(false);
                }}
                placeholder="••••••••••"
                autoComplete="current-password"
                disabled={detailsHidden}
                aria-invalid={loginFailed}
              />

              <div className="auth-remember-row">
                <label className="field-aside">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={detailsHidden}
                  />
                  Remember me
                </label>
                <button type="button" className="link-btn quiet" disabled={detailsHidden}>
                  Forgot Password?
                </button>
              </div>

              {loginFailed && <p className="error-text" role="alert">Invalid email or password</p>}

              <button type="submit" className="btn full auth-submit" disabled={detailsHidden || !isValid}>
                {expanding ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </div>

          <div className="auth-dialog-bottom">
            <span className="auth-status-copyright">© 2026 FORGE from Aetherware</span>
            <span>{formatStatusClock(now)}</span>
          </div>
        </div>
      </form>

      {/* Hidden off-screen clone of the real destination, used only to
          measure its actual rendered height (see handleSubmit) — never
          shown. Rendering the actual Dashboard component inside the
          actual .app-main/.app-card shapes (rather than a hand-copied
          approximation) means this can't drift out of sync with what
          those really render, dimensionally or structurally. */}
      <div
        ref={measureMainRef}
        className="app-main"
        aria-hidden="true"
        style={{ position: 'fixed', top: -99999, left: 0, visibility: 'hidden', pointerEvents: 'none' }}
      >
        <div ref={measureCardRef} className="app-card">
          <Dashboard />
        </div>
      </div>
    </main>
  );
};

export default Login;
