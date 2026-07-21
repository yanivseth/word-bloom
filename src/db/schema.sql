CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY,
  child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  date_added TIMESTAMPTZ DEFAULT NOW(),
  type TEXT DEFAULT 'word' CHECK (type IN ('sound', 'approximation', 'word')),
  -- 'manual' = parent typed it; 'suggestion' = logged via the "Said it!"
  -- button on a phrase card (phrase-effectiveness signal)
  source TEXT DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_words_child_id ON words(child_id);
CREATE INDEX IF NOT EXISTS idx_children_account_id ON children(account_id);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  started_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phrase_views (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  child_id INTEGER REFERENCES children(id),
  phrase_text TEXT NOT NULL,
  context TEXT,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  was_refreshed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_account_id ON push_subscriptions(account_id);

CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
