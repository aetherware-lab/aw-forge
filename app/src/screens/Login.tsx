import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';

const EXPAND_MS = 320;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [expanding, setExpanding] = useState(false);
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const backdropRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || expanding) return;

    // Pin the dialog to its current on-screen rect, then let it grow to
    // cover the backdrop — a FLIP transition into the dashboard shell.
    const dialog = dialogRef.current;
    const bounds = backdropRef.current?.getBoundingClientRect();
    if (dialog && bounds) {
      const rect = dialog.getBoundingClientRect();
      dialog.style.position = 'fixed';
      dialog.style.margin = '0';
      dialog.style.top = `${rect.top}px`;
      dialog.style.left = `${rect.left}px`;
      dialog.style.width = `${rect.width}px`;
      dialog.style.height = `${rect.height}px`;
      // Force layout so the pinned rect is committed before animating.
      void dialog.offsetHeight;
      requestAnimationFrame(() => {
        setExpanding(true);
        dialog.style.top = `${bounds.top}px`;
        dialog.style.left = `${bounds.left}px`;
        dialog.style.width = `${bounds.width}px`;
        dialog.style.height = `${bounds.height}px`;
      });
    }

    // Stubbed — no real auth yet.
    window.setTimeout(() => {
      login(email.trim());
      navigate('/solicitations', { replace: true });
    }, dialog && bounds ? EXPAND_MS : 0);
  };

  return (
    <>
      <div className="chrome-bar">
        <span>forge.wsgc.local</span>
        <span aria-hidden="true">·</span>
      </div>
      <main className="auth-backdrop" ref={backdropRef}>
        <form
          className={`auth-dialog${expanding ? ' auth-dialog--expand' : ''}`}
          ref={dialogRef}
          onSubmit={handleSubmit}
        >
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
              disabled={expanding}
            />

            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              disabled={expanding}
            />
          </div>

          <div className="auth-dialog-bottom">
            <button type="submit" className="btn full" disabled={expanding}>
              {expanding ? 'Signing in…' : 'Log In'}
            </button>
            <p className="muted">Prototype build — any email signs you in.</p>
          </div>
        </form>
      </main>
    </>
  );
};

export default Login;
