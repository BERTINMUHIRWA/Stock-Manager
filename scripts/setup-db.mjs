// Creates the tables in your Postgres database:  npm run db:setup
// Reads DATABASE_URL from .env.local (copy .env.example to .env.local first).
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Put it in .env.local (see .env.example).');
  process.exit(1);
}

const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log('Done: the tables are ready.');
} catch (error) {
  console.error('Could not set up the database:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
