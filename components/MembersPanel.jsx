'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { dateTime } from '@/lib/client/format';

/** Admin only: see everyone who registered and promote/demote members. */
export default function MembersPanel({ currentUser, notify }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .users()
      .then((res) => setUsers(res.users))
      .catch((e) => setError(e.message));
  }, []);

  async function changeRole(member, role) {
    try {
      const res = await api.setRole(member.id, role);
      setUsers((list) => list.map((u) => (u.id === member.id ? res.user : u)));
      notify(`${member.name} is now ${role === 'admin' ? 'an admin' : 'a member'}.`);
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  if (error) return <p className="form-error">{error}</p>;
  if (!users) return <p className="muted">Loading members…</p>;

  return (
    <section className="card">
      <h2>Members</h2>
      <p className="muted small">
        Admins can edit the budget list and void purchases. Members can record purchases.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  {u.id === currentUser.id && <span className="badge">You</span>}
                </td>
                <td>{u.email}</td>
                <td>{dateTime(u.created_at)}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={u.id === currentUser.id}
                    onChange={(e) => changeRole(u, e.target.value)}
                    aria-label={`Role for ${u.name}`}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
