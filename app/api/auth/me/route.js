// GET /api/auth/me  ->  { user }   (401 when nobody is logged in)
import { publicUser, requireAuth } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  const user = await requireAuth(request);
  return json({ user: publicUser(user) });
});
