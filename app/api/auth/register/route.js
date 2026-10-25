// POST /api/auth/register   body { name, email, password, invite_code? }
// The very first account becomes the admin. Logs the new user in.
import { createSession, hashPassword, publicUser, safeEqual, setSessionCookie } from '@/lib/server/auth';
import { withTransaction } from '@/lib/server/db';
import { HttpError, json, readJson, route } from '@/lib/server/http';
import { cleanString } from '@/lib/server/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
  const body = await readJson(request);
  const name = cleanString(body.name);
  const email = cleanString(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  const requiredCode = process.env.INVITE_CODE || '';
  if (requiredCode && !safeEqual(requiredCode, cleanString(body.invite_code))) {
    throw new HttpError(403, 'That invite code is not correct.');
  }
  if (!name || name.length > 100) {
    throw new HttpError(422, 'Please enter your name (up to 100 characters).');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    throw new HttpError(422, 'Please enter a valid email address.');
  }
  if (password.length < 8 || password.length > 200) {
    throw new HttpError(422, 'The password must be 8 to 200 characters.');
  }

  const passwordHash = await hashPassword(password);

  const user = await withTransaction(async (db) => {
    // One sign-up at a time, so two people cannot both become "the first user".
    await db.query("SELECT pg_advisory_xact_lock(hashtext('cb_register'))");
    const {
      rows: [{ n }],
    } = await db.query('SELECT COUNT(*)::int AS n FROM users');
    const role = n === 0 ? 'admin' : 'member';

    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, role`,
      [name, email, passwordHash, role],
    );
    if (rows.length === 0) throw new HttpError(409, 'An account with that email already exists.');
    return rows[0];
  });

  const token = await createSession(user.id);
  const response = json({ user: publicUser(user) }, 201);
  setSessionCookie(response, request, token);
  return response;
});
