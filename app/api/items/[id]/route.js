// PUT    /api/items/5   admin only   body { name, estimated_price, quantity } -> { item, summary }
// DELETE /api/items/5   admin only   refused if the item already has purchases -> { ok, summary }
import { requireAdmin } from '@/lib/server/auth';
import { fetchItems, getSummary, parseItemInput } from '@/lib/server/budget';
import { isUniqueViolation, query } from '@/lib/server/db';
import { HttpError, json, readId, readJson, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = route(async (request, context) => {
  await requireAdmin(request);
  const id = await readId(context);
  if ((await fetchItems(id)).length === 0) throw new HttpError(404, 'Item not found.');

  const { name, price, quantity } = parseItemInput(await readJson(request));
  try {
    await query(
      'UPDATE budget_items SET name = $1, estimated_price = $2, quantity = $3 WHERE id = $4',
      [name, price, quantity, id],
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'Another item already has that name.');
    throw error;
  }

  const [items, summary] = await Promise.all([fetchItems(id), getSummary()]);
  return json({ item: items[0], summary });
});

export const DELETE = route(async (request, context) => {
  await requireAdmin(request);
  const id = await readId(context);
  if ((await fetchItems(id)).length === 0) throw new HttpError(404, 'Item not found.');

  const { rows } = await query('SELECT COUNT(*)::int AS n FROM transactions WHERE budget_item_id = $1', [id]);
  if (rows[0].n > 0) {
    throw new HttpError(409, 'This item already has purchases, so it cannot be deleted. Edit it instead.');
  }

  await query('DELETE FROM budget_items WHERE id = $1', [id]);
  return json({ ok: true, summary: await getSummary() });
});
