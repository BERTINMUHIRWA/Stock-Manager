'use client';

import { useMemo, useRef, useState } from 'react';
import { CURRENCY, money, num } from '@/lib/client/format';

/**
 * "I bought something": pick a product from the budget list (or type a new one),
 * enter how many and the TOTAL price paid, and submit.
 */
export default function PurchaseForm({ items, summary, onSubmit, notify }) {
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const productInput = useRef(null);

  // Does what was typed match an item on the budget list?
  const matched = useMemo(() => {
    const typed = product.trim().toLowerCase();
    return typed ? items.find((i) => i.name.trim().toLowerCase() === typed) : undefined;
  }, [items, product]);

  const qty = Number(quantity);
  const paid = Number(amount);
  const validAmount = amount !== '' && Number.isFinite(paid) && paid > 0;
  const balanceAfter = validAmount ? Math.round((summary.remaining - paid) * 100) / 100 : null;
  const tooMuch = balanceAfter !== null && balanceAfter < 0;
  const canSubmit = product.trim() !== '' && qty > 0 && validAmount && !busy;

  const estimate = matched && qty > 0 ? matched.estimated_price * qty : null;
  const left = matched ? Math.max(0, matched.quantity - matched.qty_bought) : 0;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setBusy(true);
    try {
      const res = await onSubmit({
        budget_item_id: matched ? matched.id : null,
        item_name: product.trim(),
        quantity: qty,
        amount_paid: paid,
        note: note.trim(),
      });
      notify(`Recorded ${res.purchase.item_name} for ${money(res.purchase.amount_paid)}. Balance: ${money(res.summary.remaining)}.`);
      setProduct('');
      setQuantity('1');
      setAmount('');
      setNote('');
      productInput.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Record a purchase</h2>
      <p className="muted small">Choose a product from the list or type something new.</p>

      <label className="field">
        <span>Product bought</span>
        <input
          ref={productInput}
          list="product-options"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Start typing or pick from the list"
          maxLength={150}
          autoComplete="off"
          required
        />
        <datalist id="product-options">
          {items.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
      </label>

      {matched && (
        <p className="hint">
          Planned: {num(matched.quantity)} × {money(matched.estimated_price)} = {money(matched.estimated_total)}.
          Bought so far: {num(matched.qty_bought)}. Left to buy: {num(left)}.
        </p>
      )}
      {!matched && product.trim() !== '' && (
        <p className="hint warn-text">Not on the budget list. It will be saved as an unplanned purchase.</p>
      )}

      <div className="row">
        <label className="field">
          <span>Quantity</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Total price paid ({CURRENCY})</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={estimate ? `about ${num(estimate)}` : '0.00'}
            required
          />
        </label>
      </div>

      <label className="field">
        <span>Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Shop, receipt number…" />
      </label>

      {validAmount && (
        <p className={`after ${tooMuch ? 'bad' : ''}`}>
          Balance after this purchase: <strong>{money(balanceAfter)}</strong>
          {tooMuch && !summary.allow_overspend && ' — not enough money left, so this will be rejected.'}
          {tooMuch && summary.allow_overspend && ' — this goes over the budget.'}
        </p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="btn" type="submit" disabled={!canSubmit}>
        {busy ? 'Saving…' : 'Save purchase'}
      </button>
    </form>
  );
}
