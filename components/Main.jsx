'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';
import BalanceCards from './BalanceCards';
import PurchaseForm from './PurchaseForm';
import ItemForm from './ItemForm';
import ItemsTable from './ItemsTable';
import HistoryTable from './HistoryTable';
import MembersPanel from './MembersPanel';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'Budget list' },
  { id: 'history', label: 'Purchases' },
  { id: 'members', label: 'Members', adminOnly: true },
];

/** The signed-in app: header, tabs and the four screens. */
export default function Main({ user, onLogout }) {
  const isAdmin = user.role === 'admin';
  const data = useBudgetData();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);

  const notify = useCallback((text, type = 'ok') => setNotice({ text, type, id: Date.now() }), []);

  // Hide the pop-up message after 5 seconds.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function saveItem(values) {
    if (editing) {
      await data.updateItem(editing.id, values);
      notify(`“${values.name}” updated.`);
      setEditing(null);
    } else {
      await data.addItem(values);
      notify(`“${values.name}” added to the budget.`);
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete “${item.name}” from the budget list?`)) return;
    try {
      await data.deleteItem(item.id);
      if (editing?.id === item.id) setEditing(null);
      notify(`“${item.name}” deleted.`);
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function voidPurchase(purchase) {
    if (!window.confirm(`Void the purchase of “${purchase.item_name}”? The money goes back into the balance.`)) return;
    try {
      await data.voidPurchase(purchase.id);
      notify('Purchase voided. The money is back in the balance.');
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
                        <span className="brand-mark" aria-hidden="true">BFL</span>
            BFL Manager
          </div>
          <div className="who">
            <span>
              {user.name} <span className="badge light">{isAdmin ? 'Admin' : 'Member'}</span>
            </span>
            <button className="btn small ghost" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'active' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {data.error && (
          <div className="banner" role="alert">
            <span>{data.error}</span>
            <button className="btn small secondary" type="button" onClick={data.refresh}>
              Try again
            </button>
          </div>
        )}

        {data.loading ? (
          <p className="muted">Loading the budget…</p>
        ) : (
          <>
            {tab === 'overview' && (
              <>
                <BalanceCards summary={data.summary} />
                <div className="grid-2">
                  <PurchaseForm
                    items={data.items}
                    summary={data.summary}
                    onSubmit={data.addPurchase}
                    notify={notify}
                  />
                  <section className="card">
                    <h2>Latest purchases</h2>
                    <HistoryTable purchases={data.purchases.slice(0, 6)} compact />
                    {data.purchases.length > 6 && (
                      <button className="link-btn" type="button" onClick={() => setTab('history')}>
                        See all purchases
                      </button>
                    )}
                  </section>
                </div>
              </>
            )}

            {tab === 'items' && (
              <>
                {isAdmin && <ItemForm editing={editing} onSubmit={saveItem} onCancel={() => setEditing(null)} />}
                <section className="card">
                  <h2>Budget list</h2>
                  <ItemsTable items={data.items} isAdmin={isAdmin} onEdit={setEditing} onDelete={removeItem} />
                </section>
              </>
            )}

            {tab === 'history' && (
              <section className="card">
                <h2>All purchases</h2>
                <HistoryTable purchases={data.purchases} isAdmin={isAdmin} onVoid={voidPurchase} />
              </section>
            )}

            {tab === 'members' && isAdmin && <MembersPanel currentUser={user} notify={notify} />}
          </>
        )}
      </main>

      {notice && (
        <div key={notice.id} className={`toast ${notice.type}`} role="status">
          {notice.text}
        </div>
      )}
    </div>
  );
}
