'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', invite_code: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = isRegister
        ? await api.register(form)
        : await api.login({ email: form.email, password: form.password });
      onAuth(res); // this screen is replaced by the app, so there is nothing more to do here
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
                <div className="brand-mark big" aria-hidden="true">BFL</div>
                <h1>BFL Manager</h1>
        <p className="muted">
          {isRegister ? 'Create your account to join the budget.' : 'Log in to see the budget and record purchases.'}
        </p>

        {isRegister && (
          <label className="field">
            <span>Your name</span>
            <input value={form.name} onChange={set('name')} autoComplete="name" required maxLength={100} />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>

        <label className="field">
          <span>Password{isRegister && ' (at least 8 characters)'}</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? 8 : undefined}
          />
        </label>

        {isRegister && (
          <label className="field">
            <span>Invite code (only if your group gave you one)</span>
            <input value={form.invite_code} onChange={set('invite_code')} autoComplete="off" />
          </label>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="switch">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError('');
            }}
          >
            {isRegister ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  );
}
