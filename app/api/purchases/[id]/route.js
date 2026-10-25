// DELETE /api/purchases/9   admin only: VOIDS a mistaken purchase.
// The row stays in the history, but its money goes back into the balance.
import { requireAdmin } from '@/lib/server/auth';
import { fetchItems, fetchPurchase, getSummary } from '@/lib/server/budget';
import { query } from '@/lib/server/db';
import { HttpError, json, readId, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = route(async (request, context) => {
  const admin = await requireAdmin(request);
  const id = await readId(context);

  const purchase = await fetchPurchase(id);
  if (!purchase) throw new HttpError(404, 'Purchase not found.');
  if (purchase.voided_at) throw new HttpError(409, 'This purchase has already been voided.');

  await query(
    'UPDATE transactions SET voided_at = now(), voided_by = $1 WHERE id = $2 AND voided_at IS NULL',
    [admin.id, id],
  );

  const [updated, summary, items] = await Promise.all([
    fetchPurchase(id),
    getSummary(),
    purchase.budget_item_id !== null ? fetchItems(purchase.budget_item_id) : Promise.resolve([]),
  ]);
  return json({ purchase: updated, summary, item: items[0] ?? null });
});
