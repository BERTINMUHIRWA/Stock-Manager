'use client';

import { useMemo, useState } from 'react';
import { dateTime, money, num } from '@/lib/client/format';

/** Who bought what, for how much, and when. `compact` is the short version for the overview. */
export default function HistoryTable({ purchases, isAdmin = false, onVoid, compact = false }) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) => `${p.item_name} ${p.user_name} ${p.note ?? ''}`.toLowerCase().includes(q));
  }, [purchases, search]);

  if (purchases.length === 0) {
    return <p className="empty">No purchases yet. They will appear here as soon as someone records one.</p>;
  }

  return (
    <>
      {!compact && (
        <label className="field search">
          <span className="sr-only">Search purchases</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, person or note"
          />
        </label>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              {!compact && <th className="num">Qty</th>}
              <th className="num">Paid</th>
              <th>Bought by</th>
              {!compact && isAdmin && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={p.voided_at ? 'voided' : ''}>
                <td>{dateTime(p.created_at)}</td>
                <td>
                  <strong>{p.item_name}</strong>
                  {!p.planned && <span className="badge warn">Unplanned</span>}
                  {p.voided_at && <span className="badge danger">Voided</span>}
                  {!compact && p.note && <div className="muted small">{p.note}</div>}
                </td>
                {!compact && <td className="num">{num(p.quantity)}</td>}
                <td className="num">{money(p.amount_paid)}</td>
                <td>{p.user_name}</td>
                {!compact && isAdmin && (
                  <td className="actions-cell">
                    {!p.voided_at && (
                      <button className="btn small danger" type="button" onClick={() => onVoid(p)}>
                        Void
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">Nothing matches “{search}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
