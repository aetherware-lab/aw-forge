import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Stubbed — no real auth yet.
    login(email.trim());
    navigate('/dashboard', { replace: true });
  };

  return (
    <>
      <div className="chrome-bar">
        <span>qmat.wsgc.local</span>
        <span aria-hidden="true">·</span>
      </div>
      <main className="screen-body">
        <form className="centered-form" onSubmit={handleSubmit}>
          <div
            style={{
              border: '1.5px solid var(--box-line)',
              background: 'var(--surface-3)',
              borderRadius: 'var(--radius-sm)',
              padding: '18px',
              textAlign: 'center',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            CMat Generator
          </div>

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
          />

          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            autoComplete="current-password"
          />

          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn full">Log In</button>
          </div>

          <p
            className="muted"
            style={{ fontSize: 11, marginTop: 16, textAlign: 'center' }}
          >
            Prototype build — any email signs you in.
          </p>
        </form>
      </main>
    </>
  );
};

export default Login;
