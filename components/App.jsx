'use client';

import { useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/lib/client/api';
import AuthPage from './AuthPage';
import Main from './Main';

/** Decides what to show: the login screen, or the budget app for a logged-in user. */
export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // If the server ever says "your login expired", go back to the login screen.
    setUnauthorizedHandler(() => setUser(null));

    // The login cookie is sent automatically. A 401 here just means "not logged in yet".
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* the session may already be gone, that is fine */
    }
    setUser(null);
  };

  if (booting) return <div className="splash">Loading…</div>;
  if (!user) return <AuthPage onAuth={({ user: loggedIn }) => setUser(loggedIn)} />;
  return <Main user={user} onLogout={handleLogout} />;
}
