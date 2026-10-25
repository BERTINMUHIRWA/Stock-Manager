'use client';

import { money, num } from '@/lib/client/format';

/** The budget list with how much of each item has been bought and spent. */
export default function ItemsTable({ items, isAdmin, onEdit, onDelete }) {
  if (items.length === 0) {
    return (
      <p className="empty">
        {isAdmin
          ? 'The budget list is empty. Add your first item above to set the budget.'
          : 'The budget list is empty. An admin needs to add the planned items first.'}
      </p>
    );
  }

  const totalEstimated = items.reduce((sum, i) => sum + i.estimated_total, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.spent, 0);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Price each</th>
            <th className="num">Budget</th>
            <th className="num">Spent</th>
            <th>Bought</th>
            {isAdmin && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const percent = Math.min(100, (item.qty_bought / item.quantity) * 100);
            const status =
              item.qty_bought <= 0 ? 'Not yet' : item.qty_bought < item.quantity ? 'Partly' : 'Done';
            return (
              <tr key={item.id}>
                <td data-label="Item">
                  <strong>{item.name}</strong>
                </td>
                <td className="num">{num(item.quantity)}</td>
                <td className="num">{num(item.estimated_price)}</td>
                <td className="num">{num(item.estimated_total)}</td>
                <td className={`num ${item.spent > item.estimated_total ? 'text-danger' : ''}`}>
                  {num(item.spent)}
                </td>
                <td>
                  <div className="mini-progress" aria-hidden="true">
                    <div style={{ width: `${percent}%` }} />
                  </div>
                  <span className={`badge ${status === 'Done' ? 'ok' : status === 'Partly' ? 'warn' : ''}`}>
                    {status} · {num(item.qty_bought)}/{num(item.quantity)}
                  </span>
                </td>
                {isAdmin && (
                  <td className="actions-cell">
                    <button className="btn small secondary" type="button" onClick={() => onEdit(item)}>
                      Edit
                    </button>{' '}
                    <button className="btn small danger" type="button" onClick={() => onDelete(item)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td className="num">{money(totalEstimated)}</td>
            <td className="num">{money(totalSpent)}</td>
            <td colSpan={isAdmin ? 2 : 1} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
