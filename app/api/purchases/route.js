// Purchases (the expense log).
//
//   GET  /api/purchases?limit=200   any logged-in user -> { purchases } newest first
//   POST /api/purchases             any logged-in user
//        body { budget_item_id?, item_name?, quantity, amount_paid, note? }
//        -> { purchase, summary, item }   (summary.remaining is the NEW balance)
import { requireAuth } from '@/lib/server/auth';
import { allowOverspend, fetchItems, fetchPurchase, fetchPurchases, getSummary } from '@/lib/server/budget';
import { withTransaction } from '@/lib/server/db';
import { HttpError, json, readJson, route } from '@/lib/server/http';
import { cents, cleanString, formatAmount, round2, toNumber } from '@/lib/server/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  await requireAuth(request);
  const requested = parseInt(new URL(request.url).searchParams.get('limit') ?? '100', 10);
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 100, 1), 500);
  return json({ purchases: await fetchPurchases(limit) });
});

export const POST = route(async (request) => {
  const user = await requireAuth(request);
  const body = await readJson(request);

  const quantityRaw = toNumber(body.quantity ?? 1);
  const amountRaw = toNumber(body.amount_paid);
  const quantity = quantityRaw === null ? null : round2(quantityRaw);
  const amount = amountRaw === null ? null : round2(amountRaw);
  const note = cleanString(body.note);
  let name = cleanString(body.item_name);
  const idRaw = Number(body.budget_item_id);
  let itemId = Number.isInteger(idRaw) && idRaw > 0 ? idRaw : null;

  if (quantity === null || quantity <= 0 || quantity > 9_999_999) {
    throw new HttpError(422, 'Please enter a quantity greater than 0.');
  }
  if (amount === null || amount <= 0 || amount > 9_999_999_999) {
    throw new HttpError(422, 'Please enter the price paid (more than 0).');
  }
  if (note.length > 255) throw new HttpError(422, 'The note is too long (255 characters at most).');

  const newId = await withTransaction(async (db) => {
    // One purchase at a time, so two people paying together can never both
    // spend the same last money. The lock is released automatically at COMMIT.
    await db.query("SELECT pg_advisory_xact_lock(hashtext('cb_purchase'))");

    // Which budget item does this purchase belong to (if any)?
    let item;
    if (itemId !== null) {
      item = (await db.query('SELECT id, name FROM budget_items WHERE id = $1', [itemId])).rows[0];
      if (!item) throw new HttpError(404, 'That item is not on the budget list.');
    } else {
      if (!name || name.length > 150) throw new HttpError(422, 'Please choose or type the product you bought.');
      // A typed name that matches a planned item (ignoring capitals) is linked to it automatically.
      item = (await db.query('SELECT id, name FROM budget_items WHERE lower(name) = lower($1)', [name])).rows[0];
    }
    if (item) {
      itemId = item.id;
      name = item.name;
    }

    // The balance check and the insert happen together, inside the lock.
    const before = await getSummary(db);
    if (!allowOverspend() && cents(amount) > cents(before.remaining)) {
      throw new HttpError(
        422,
        `Not enough money left: this purchase is ${formatAmount(amount)} but the remaining balance is ${formatAmount(before.remaining)}.`,
      );
    }

    const { rows } = await db.query(
      `INSERT INTO transactions (budget_item_id, item_name, quantity, amount_paid, note, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [itemId, name, quantity, amount, note || null, user.id],
    );
    return rows[0].id;
  });

  const [purchase, summary, items] = await Promise.all([
    fetchPurchase(newId),
    getSummary(), // <- includes the new remaining balance
    itemId !== null ? fetchItems(itemId) : Promise.resolve([]),
  ]);
  return json({ purchase, summary, item: items[0] ?? null }, 201);
});
