// GET /api/users   admin only -> { users }
import { requireAdmin } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { json, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  await requireAdmin(request);
  const { rows } = await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at, id');
  return json({ users: rows });
});
