// The budget maths and the queries behind every screen (server only).
// Everything is calculated from the saved rows, never from a stored balance.
import { query } from './db.js';
import { HttpError } from './http.js';
import { cleanString, round2, toNumber } from './validate.js';

const pool = { query };

export const allowOverspend = () => String(process.env.ALLOW_OVERSPEND).toLowerCase() === 'true';

/** Total budget, money spent and the remaining balance. `db` can be a transaction client. */
export async function getSummary(db = pool) {
  const {
    rows: [r],
  } = await db.query(`
    SELECT
      (SELECT COALESCE(SUM(estimated_price * quantity), 0) FROM budget_items)               AS total_budget,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM transactions WHERE voided_at IS NULL)      AS total_spent,
      (SELECT COUNT(*) FROM budget_items)::int                                              AS item_count,
      (SELECT COUNT(*) FROM transactions WHERE voided_at IS NULL)::int                      AS purchase_count
  `);
  const total = round2(Number(r.total_budget));
  const spent = round2(Number(r.total_spent));
  return {
    total_budget: total,
    total_spent: spent,
    remaining: round2(total - spent),
    item_count: r.item_count,
    purchase_count: r.purchase_count,
    allow_overspend: allowOverspend(),
  };
}

/* ------------------------------ items ------------------------------ */

function formatItem(r) {
  const price = Number(r.estimated_price);
  const quantity = Number(r.quantity);
  return {
    id: r.id,
    name: r.name,
    estimated_price: price,
    quantity,
    estimated_total: round2(price * quantity),
    spent: round2(Number(r.spent)),
    qty_bought: Number(r.qty_bought),
    created_at: r.created_at,
  };
}

/** All budget items (or just one) with how much has been spent on each. */
export async function fetchItems(id = null, db = pool) {
  const { rows } = await db.query(
    `SELECT b.id, b.name, b.estimated_price, b.quantity, b.created_at,
            COALESCE(SUM(t.amount_paid), 0) AS spent,
            COALESCE(SUM(t.quantity), 0)    AS qty_bought
       FROM budget_items b
       LEFT JOIN transactions t ON t.budget_item_id = b.id AND t.voided_at IS NULL
      ${id !== null ? 'WHERE b.id = $1' : ''}
      GROUP BY b.id
      ORDER BY lower(b.name)`,
    id !== null ? [id] : [],
  );
  return rows.map(formatItem);
}

/** Validates the fields shared by "add item" and "edit item". */
export function parseItemInput(body) {
  const name = cleanString(body.name);
  const priceRaw = toNumber(body.estimated_price);
  const quantityRaw = toNumber(body.quantity);
  const price = priceRaw === null ? null : round2(priceRaw);
  const quantity = quantityRaw === null ? null : round2(quantityRaw);

  if (!name || name.length > 150) {
    throw new HttpError(422, 'Please enter an item name (up to 150 characters).');
  }
  if (price === null || price < 0 || price > 9_999_999_999) {
    throw new HttpError(422, 'Please enter a valid estimated price (0 or more).');
  }
  if (quantity === null || quantity <= 0 || quantity > 9_999_999) {
    throw new HttpError(422, 'Please enter a quantity greater than 0.');
  }
  return { name, price, quantity };
}

/* ---------------------------- purchases ---------------------------- */

function formatPurchase(r) {
  return {
    id: r.id,
    budget_item_id: r.budget_item_id,
    item_name: r.item_name,
    planned: r.budget_item_id !== null,
    quantity: Number(r.quantity),
    amount_paid: round2(Number(r.amount_paid)),
    note: r.note,
    user_id: r.user_id,
    user_name: r.user_name,
    created_at: r.created_at,
    voided_at: r.voided_at,
  };
}

const PURCHASE_SELECT = `
  SELECT t.id, t.budget_item_id, t.item_name, t.quantity, t.amount_paid, t.note,
         t.user_id, u.name AS user_name, t.created_at, t.voided_at
    FROM transactions t JOIN users u ON u.id = t.user_id`;

/** Newest first. */
export async function fetchPurchases(limit = 100) {
  const { rows } = await query(`${PURCHASE_SELECT} ORDER BY t.created_at DESC, t.id DESC LIMIT $1`, [limit]);
  return rows.map(formatPurchase);
}

export async function fetchPurchase(id) {
  const { rows } = await query(`${PURCHASE_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] ? formatPurchase(rows[0]) : null;
}
