import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { IconCheck } from '@/components/Icon';
import WindowControls from '@/components/WindowControls';

const DETAIL_FADE_MS = 160;
const FILL_MS = 320;
const JUST_LOGGED_IN_KEY = 'forge-just-logged-in';

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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isValid = EMAIL_RE.test(email.trim()) && password.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || detailsHidden) return;
    setLoginFailed(false);

    // Step 1: fade out the card's own details (fields, copy)...
    setDetailsHidden(true);
    // ...and fill the card's background with var(--surface) — .app-card's
    // own background — so the small card sitting here becomes a plain
    // colored box (no resize; AppShell's entry overlay is what actually
    // grows to the real .app-card's size, starting from this exact same
    // small centered rect — see AppShell.tsx). That way there's a single
    // continuous grow once AppShell mounts, not a fade-then-a-separate-
    // expand-then-another-shrink.
    setExpanding(true);

    // Step 2: once both of those finish, hand off to the app shell.
    window.setTimeout(() => {
      try {
        sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1');
      } catch {
        /* sessionStorage unavailable — app shell just skips the animation */
      }
      login(email.trim());
      navigate('/solicitations', { replace: true });
    }, Math.max(DETAIL_FADE_MS, FILL_MS));
  };

  return (
    <main className="auth-backdrop bg-grid">
      <WindowControls floating />
      <form
        className={`auth-dialog${expanding ? ' auth-dialog--expand' : ''}`}
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

        <div className={`auth-success-check${detailsHidden ? ' is-visible' : ''}`} aria-hidden="true">
          <IconCheck size={28} />
        </div>
      </form>
    </main>
  );
};

export default Login;
