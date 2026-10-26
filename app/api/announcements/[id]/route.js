// DELETE /api/announcements/5   admin only -> { ok }
import { requireAdmin } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { HttpError, json, readId, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = route(async (request, context) => {
  await requireAdmin(request);
  const id = await readId(context);
  const { rowCount } = await query('DELETE FROM announcements WHERE id = $1', [id]);
  if (rowCount === 0) throw new HttpError(404, 'Announcement not found.');
  return json({ ok: true });
});