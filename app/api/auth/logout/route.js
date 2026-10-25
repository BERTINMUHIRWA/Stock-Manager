// POST /api/auth/logout
import { clearSessionCookie, destroySession } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
  await destroySession(request);
  const response = json({ ok: true });
  clearSessionCookie(response, request);
  return response;
});
