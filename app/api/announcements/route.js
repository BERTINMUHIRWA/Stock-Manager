// Announcements: messages the admin posts, visible to everyone who is logged in.
//
//   GET  /api/announcements   any logged-in user -> { announcements }  newest first (latest 50)
//   POST /api/announcements   admin only         body { message }      -> { announcement }
import { requireAdmin, requireAuth } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { HttpError, json, readJson, route } from '@/lib/server/http';
import { cleanString } from '@/lib/server/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT = `
  SELECT a.id, a.message, a.created_at, u.name AS author
    FROM announcements a JOIN users u ON u.id = a.created_by`;

export const GET = route(async (request) => {
  await requireAuth(request);
  const { rows } = await query(`${SELECT} ORDER BY a.created_at DESC, a.id DESC LIMIT 50`);
  return json({ announcements: rows });
});

export const POST = route(async (request) => {
  const admin = await requireAdmin(request);
  const body = await readJson(request);
  const message = typeof body.message === 'string' ? body.message.trim() : cleanString(body.message);

  if (!message) throw new HttpError(422, 'Please write a message.');
  if (message.length > 1000) throw new HttpError(422, 'The message is too long (1000 characters at most).');

  const {
    rows: [created],
  } = await query('INSERT INTO announcements (message, created_by) VALUES ($1, $2) RETURNING id', [
    message,
    admin.id,
  ]);
  const { rows } = await query(`${SELECT} WHERE a.id = $1`, [created.id]);
  return json({ announcement: rows[0] }, 201);
});