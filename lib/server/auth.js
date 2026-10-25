// Passwords, login sessions and permission checks (server only).
//
// Login works with a random token kept in an httpOnly cookie, so JavaScript on the
// page can never read it. Only a SHA-256 hash of the token is stored in the database.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { query } from './db.js';
import { HttpError } from './http.js';

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = 'cb_session';
const sessionDays = () => Math.max(1, Number(process.env.SESSION_DAYS) || 14);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/* ---------------------------- passwords ---------------------------- */

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

// Used when the email does not exist, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(64).toString('base64')}`;

export async function verifyPassword(password, stored) {
  const [scheme, saltB64, keyB64] = String(stored || DUMMY_HASH).split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Compares two secrets without leaking how many characters matched. */
export function safeEqual(a, b) {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y);
}

/* ---------------------------- sessions ----------------------------- */

export async function createSession(userId) {
  await query('DELETE FROM auth_tokens WHERE expires_at < now()'); // tidy up old logins
  const token = randomBytes(32).toString('hex');
  await query(
    `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [userId, sha256(token), sessionDays()],
  );
  return token;
}

export async function destroySession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM auth_tokens WHERE token_hash = $1', [sha256(token)]);
}

function isSecure(request) {
  return request.nextUrl?.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
}

export function setSessionCookie(response, request, token) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(request), // true on Vercel (https), false on http://localhost
    path: '/',
    maxAge: sessionDays() * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response, request) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(request),
    path: '/',
    maxAge: 0,
  });
}

/* ------------------------- who is calling? ------------------------- */

export async function currentUser(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role
       FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

export async function requireAuth(request) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, 'Please log in to continue.');
  return user;
}

export async function requireAdmin(request) {
  const user = await requireAuth(request);
  if (user.role !== 'admin') throw new HttpError(403, 'Only an admin can do this.');
  return user;
}

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});
