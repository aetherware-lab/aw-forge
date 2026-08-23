import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useSolicitations } from '@/store/solicitations';

const DETAIL_FADE_MS = 160;
const EXPAND_MS = 320;
const JUST_LOGGED_IN_KEY = 'forge-just-logged-in';

// Matches AppShell's layout exactly (see global.css): a 48px topbar,
// then .app-main's 24px padding around a max-1200px-wide .app-card. The
// expand step below targets this same rect so the sign-in card visibly
// becomes the workspace card once the topbar drops in over it, rather
// than a mismatched size swap at the moment AppShell mounts.
const TOPBAR_H = 48;
const CARD_MARGIN = 24;
const CARD_MAX_WIDTH = 1200;

// .app-card's height is content-based (auto), not stretched to fill the
// viewport — Dashboard.tsx renders a page-header, a toolbar row, and one
// .sol-card per solicitation (or a shorter .empty state with none). There's
// no way to know its real rendered height without mounting it, so this
// estimates it from the same data Dashboard reads, rather than filling the
// entire space below the topbar regardless of how much content there is.
const APP_CARD_PADDING = 48; // .app-card's own 24px top + 24px bottom
const HEADER_H = 40; // .page-header (title only, no supporting text)
const TOOLBAR_H = 56; // search + tag/agency/sort selects row
const SOL_CARD_H = 112; // one .sol-card, incl. its margin-bottom
const EMPTY_STATE_H = 90; // .empty box shown when there are none

const estimateDashboardCardHeight = (solicitationCount: number): number =>
  APP_CARD_PADDING +
  HEADER_H +
  TOOLBAR_H +
  (solicitationCount > 0 ? solicitationCount * SOL_CARD_H : EMPTY_STATE_H);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Best-effort region name from the OS locale, for the status bar — falls
 * back to "United States" (this is a US-based GCA tool) if unavailable. */
const regionNameFromLocale = (): string => {
  try {
    const code = navigator.language.split('-')[1];
    if (!code) return 'United States';
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? 'United States';
  } catch {
    return 'United States';
  }
};

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
  const [regionName] = useState(regionNameFromLocale);
  const solicitationCount = useSolicitations((s) => s.solicitations.length);
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const backdropRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

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
    const bounds = backdropRect && {
      top: backdropRect.top + TOPBAR_H + CARD_MARGIN,
      left: backdropRect.left + Math.max(CARD_MARGIN, (backdropRect.width - CARD_MAX_WIDTH) / 2),
      width: Math.min(backdropRect.width - CARD_MARGIN * 2, CARD_MAX_WIDTH),
      // The bottom of the card should land where the real .app-card ends,
      // not stretch all the way to the bottom of the viewport — see
      // estimateDashboardCardHeight above. Still capped at the space
      // actually available, same as before, for very long lists.
      height: Math.min(
        backdropRect.height - TOPBAR_H - CARD_MARGIN * 2,
        estimateDashboardCardHeight(solicitationCount),
      ),
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
            <span className="auth-status-region">{regionName}</span>
            <span>{formatStatusClock(now)}</span>
          </div>
        </div>
      </form>
    </main>
  );
};

export default Login;
