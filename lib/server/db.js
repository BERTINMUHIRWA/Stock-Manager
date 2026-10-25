// Postgres connection (server only). Works with Neon, Supabase or any Postgres.
import pg from 'pg';

function getPool() {
  // Kept on globalThis so hot-reload in "next dev" does not open a new pool every time.
  if (!globalThis.__budgetPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Add a Postgres database and set DATABASE_URL (see README).');
    }
    const pool = new pg.Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX) || 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (error) => console.error('[community-budget] Postgres pool error:', error.message));
    globalThis.__budgetPool = pool;
  }
  return globalThis.__budgetPool;
}

/** Run one query. Returns { rows }. */
export const query = (text, params) => getPool().query(text, params);

/**
 * Run several queries as ONE all-or-nothing transaction.
 * `fn` receives a client with .query(); if it throws, everything is rolled back.
 */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* the connection is already gone */
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Postgres error code 23505 = "duplicate value in a unique column". */
export const isUniqueViolation = (error) => error?.code === '23505';
