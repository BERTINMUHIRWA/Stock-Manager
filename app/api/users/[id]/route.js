// PATCH /api/users/3   admin only   body { role: "admin" | "member" } -> { user }
import { requireAdmin } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { HttpError, json, readId, readJson, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = route(async (request, context) => {
  const admin = await requireAdmin(request);
  const id = await readId(context);
  const { role } = await readJson(request);

  if (role !== 'admin' && role !== 'member') {
    throw new HttpError(422, 'The role must be "admin" or "member".');
  }
  if (id === admin.id) throw new HttpError(422, 'You cannot change your own role.');

  const { rows } = await query(
    'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at',
    [role, id],
  );
  if (rows.length === 0) throw new HttpError(404, 'Member not found.');
  return json({ user: rows[0] });
});
