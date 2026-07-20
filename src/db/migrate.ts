/**
 * Database migration runner.
 * Uses `CREATE IF NOT EXISTS` so it's safe to call on every server start.
 * Called automatically on first database access from queries.ts.
 */
import { sql as getSql } from "~/db";

let migrated = false;

export async function runMigrations(): Promise<void> {
  if (migrated) return;
  migrated = true;

  const url = process.env.DATABASE_URL;
  if (!url) return; // No database configured — skip silently

  const sql = getSql();

  try {
    await sql`CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      is_premium BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS children (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      birth_date DATE NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS words (
      id SERIAL PRIMARY KEY,
      child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      date_added TIMESTAMPTZ DEFAULT NOW(),
      type TEXT DEFAULT 'word' CHECK (type IN ('sound', 'approximation', 'word'))
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_words_child_id ON words(child_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_children_account_id ON children(account_id)`;

    // Add account_id to existing children table if it was created before this migration
    await sql`ALTER TABLE children ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id)`;

    await sql`CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(id),
      started_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS phrase_views (
      id SERIAL PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(id),
      child_id INTEGER REFERENCES children(id),
      phrase_text TEXT NOT NULL,
      context TEXT,
      shown_at TIMESTAMPTZ DEFAULT NOW(),
      was_refreshed BOOLEAN DEFAULT FALSE
    )`;

    await sql`CREATE TABLE IF NOT EXISTS promo_codes (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      max_uses INTEGER DEFAULT NULL,
      current_uses INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;

    // Seed test promo code — idempotent
    await sql`
      INSERT INTO promo_codes (code, max_uses, is_active)
      VALUES ('BLOOM2026', NULL, true)
      ON CONFLICT (code) DO NOTHING
    `;

    console.log("Database migrations completed successfully.");
  } catch (e) {
    console.error("Database migration failed:", e);
    migrated = false; // Allow retry on next attempt
  }
}
