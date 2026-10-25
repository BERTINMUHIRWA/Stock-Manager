-- ============================================================
--  Community Budget — PostgreSQL schema
--  Works on Neon, Supabase, and any PostgreSQL 13+.
--  Safe to run more than once (every statement uses IF NOT EXISTS).
--
--  Run it:  Vercel dashboard -> Storage -> your database -> Query tab -> paste -> Run
--      or:  npm run db:setup
-- ============================================================

-- users: community members who can log in.
-- The FIRST account registered becomes the 'admin'; everyone after is a 'member'.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                       -- scrypt hash, never the password
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- auth_tokens: one row per active login (the browser keeps the token in a
-- secure cookie). Only a SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens (user_id);

-- budget_items: the shopping list / planned budget.
--   estimated_price = price for ONE unit,  quantity = how many we plan to buy
--   TOTAL BUDGET (the fund) = SUM(estimated_price * quantity)
CREATE TABLE IF NOT EXISTS budget_items (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  estimated_price NUMERIC(12,2) NOT NULL CHECK (estimated_price >= 0),
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_by      INTEGER NOT NULL REFERENCES users (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- "Rice" and "rice" count as the same item.
CREATE UNIQUE INDEX IF NOT EXISTS uq_items_name ON budget_items (lower(name));

-- transactions: the purchase history (who bought what, how much, when).
--   REMAINING BALANCE = total budget - SUM(amount_paid) where voided_at IS NULL
-- The balance is always calculated from these rows, never stored, so it can
-- never drift out of sync.
-- budget_item_id is NULL for an "unplanned" purchase (a typed product that is
-- not on the list). A mistaken purchase is VOIDED by an admin, not deleted.
CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  budget_item_id  INTEGER REFERENCES budget_items (id),
  item_name       VARCHAR(150) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_paid     NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),   -- TOTAL paid
  note            VARCHAR(255),
  user_id         INTEGER NOT NULL REFERENCES users (id),           -- who bought it
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at       TIMESTAMPTZ,
  voided_by       INTEGER REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_item    ON transactions (budget_item_id);
CREATE INDEX IF NOT EXISTS idx_tx_user    ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions (created_at DESC);
