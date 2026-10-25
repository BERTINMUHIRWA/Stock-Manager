// Budget items (the shopping list). The total budget is the sum of price x quantity.
//
//   GET  /api/items   any logged-in user -> { items, summary }
//   POST /api/items   admin only         body { name, estimated_price, quantity } -> { item, summary }
import { requireAdmin, requireAuth } from '@/lib/server/auth';
import { fetchItems, getSummary, parseItemInput } from '@/lib/server/budget';
import { isUniqueViolation, query } from '@/lib/server/db';
import { HttpError, json, readJson, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  await requireAuth(request);
  const [items, summary] = await Promise.all([fetchItems(), getSummary()]);
  return json({ items, summary });
});

export const POST = route(async (request) => {
  const admin = await requireAdmin(request);
  const { name, price, quantity } = parseItemInput(await readJson(request));

  let id;
  try {
    const { rows } = await query(
      `INSERT INTO budget_items (name, estimated_price, quantity, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, price, quantity, admin.id],
    );
    id = rows[0].id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'That item is already on the budget list.');
    throw error;
  }

  const [items, summary] = await Promise.all([fetchItems(id), getSummary()]);
  return json({ item: items[0], summary }, 201);
});
