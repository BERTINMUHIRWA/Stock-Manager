// POST /api/auth/login   body { email, password }
import { createSession, publicUser, setSessionCookie, verifyPassword } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { HttpError, json, readJson, route } from '@/lib/server/http';
import { cleanString } from '@/lib/server/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
  const body = await readJson(request);
  const email = cleanString(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email],
  );
  const user = rows[0];

  // Same message for "no such email" and "wrong password", so nobody can probe which emails exist.
  const ok = await verifyPassword(password.slice(0, 200), user?.password_hash);
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');

  const token = await createSession(user.id);
  const response = json({ user: publicUser(user) });
  setSessionCookie(response, request, token);
  return response;
});
