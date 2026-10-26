'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { dateTime } from '@/lib/client/format';

const MAX = 1000;
const SHOW_FIRST = 3; // newer messages shown; the rest sit behind "Show older"
const POLL_MS = 20000; // pick up new messages every 20 seconds

/**
 * The notice board. The admin writes a message; everyone who is logged in sees it.
 * Loads and refreshes its own data, so it can be dropped into any screen.
 */
export default function Announcements({ isAdmin, notify }) {
  const [list, setList] = useState(null); // null = still loading
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.announcements();
      setList(res.announcements);
    } catch {
      setList((current) => current ?? []); // the board is optional: never block the app
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function post(e) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await api.addAnnouncement({ message: text.trim() });
      setList((current) => [res.announcement, ...(current ?? [])]);
      setText('');
      notify('Message posted for everyone.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await api.deleteAnnouncement(item.id);
      setList((current) => current.filter((a) => a.id !== item.id));
      notify('Message deleted.');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (list === null) return null;
  if (list.length === 0 && !isAdmin) return null; // members see nothing until there is a message

  const visible = showAll ? list : list.slice(0, SHOW_FIRST);
  const hidden = list.length - visible.length;

  return (
    <section className="card notice-board" aria-label="Announcements">
      <h2>Announcements</h2>

      {isAdmin && (
        <form className="notice-form" onSubmit={post}>
          <label className="field">
            <span className="sr-only">Write a message for everyone</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX}
              rows={3}
              placeholder="Write a message everyone will see…"
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="notice-actions">
            <span className="muted small">{text.length}/{MAX}</span>
            <button className="btn" type="submit" disabled={busy || !text.trim()}>
              {busy ? 'Posting…' : 'Post message'}
            </button>
          </div>
        </form>
      )}

      {list.length === 0 && <p className="empty">No messages yet. Write the first one above.</p>}

      <ul className="notice-list">
        {visible.map((a) => (
          <li key={a.id} className="notice">
            <p className="notice-text">{a.message}</p>
            <div className="notice-meta">
              <span>
                {a.author} · {dateTime(a.created_at)}
              </span>
              {isAdmin && (
                <button className="btn small danger" type="button" onClick={() => remove(a)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {(hidden > 0 || showAll) && list.length > SHOW_FIRST && (
        <button className="link-btn" type="button" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show older messages (${hidden})`}
        </button>
      )}
    </section>
  );
}