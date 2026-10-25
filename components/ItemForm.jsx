'use client';

import { useEffect, useState } from 'react';
import { money } from '@/lib/client/format';

const blank = { name: '', price: '', quantity: '1' };

/** Admin form: add an item to the budget list, or edit one (when `editing` is set). */
export default function ItemForm({ editing, onSubmit, onCancel }) {
  const [values, setValues] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fill the form when the admin clicks "Edit" on a row; clear it otherwise.
  useEffect(() => {
    setError('');
    setValues(
      editing
        ? { name: editing.name, price: String(editing.estimated_price), quantity: String(editing.quantity) }
        : blank,
    );
  }, [editing]);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const lineTotal = Number(values.price) * Number(values.quantity);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        estimated_price: Number(values.price),
        quantity: Number(values.quantity),
      });
      if (!editing) setValues(blank);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>{editing ? `Edit “${editing.name}”` : 'Add an item to the budget'}</h2>
      <p className="muted small">
        Every item adds <em>price × quantity</em> to the total budget.
      </p>

      <label className="field">
        <span>Item name</span>
        <input value={values.name} onChange={set('name')} maxLength={150} placeholder="e.g. Rice (25 kg bag)" required />
      </label>

      <div className="row">
        <label className="field">
          <span>Estimated price per unit</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.price}
            onChange={set('price')}
            required
          />
        </label>
        <label className="field">
          <span>Quantity</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={values.quantity}
            onChange={set('quantity')}
            required
          />
        </label>
      </div>

      {Number.isFinite(lineTotal) && lineTotal > 0 && (
        <p className="after">
          This item adds <strong>{money(lineTotal)}</strong> to the budget.
        </p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Add to budget'}
        </button>
        {editing && (
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
