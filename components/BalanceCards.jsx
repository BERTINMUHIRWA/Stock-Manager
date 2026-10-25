'use client';

import { money } from '@/lib/client/format';

/** The dashboard header: total budget, money spent and the remaining balance. */
export default function BalanceCards({ summary }) {
  const { total_budget: total, total_spent: spent, remaining } = summary;

  const percent = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const level = remaining < 0 ? 'danger' : total > 0 && remaining / total < 0.1 ? 'warn' : 'ok';

  return (
    <section aria-label="Budget summary">
      <div className="cards">
        <div className="card stat">
          <span className="stat-label">Total budget</span>
          <strong>{money(total)}</strong>
          <small>{summary.item_count} planned {summary.item_count === 1 ? 'item' : 'items'}</small>
        </div>

        <div className="card stat">
          <span className="stat-label">Spent so far</span>
          <strong>{money(spent)}</strong>
          <small>{summary.purchase_count} {summary.purchase_count === 1 ? 'purchase' : 'purchases'}</small>
        </div>

        <div className={`card stat stat-remaining ${level}`}>
          <span className="stat-label">Remaining balance</span>
          <strong>{money(remaining)}</strong>
          <small>
            {remaining < 0
              ? 'Over budget'
              : level === 'warn'
                ? 'Running low'
                : total > 0
                  ? 'Still available to spend'
                  : 'Add items to set the budget'}
          </small>
        </div>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-label="Budget spent"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className={`progress-bar ${level}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="muted small">{percent.toFixed(0)}% of the budget has been spent</p>
    </section>
  );
}
