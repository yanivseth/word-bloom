/**
 * Server-only database query functions.
 * Each function is wrapped in `createServerFn` so it runs on the server.
 * All timestamp and BigInt values are coerced to strings before returning to the client.
 *
 * When DATABASE_URL is not set, every function returns a graceful error/null
 * instead of throwing — the app falls back to localStorage automatically.
 */
import { createServerFn } from "@tanstack/react-start";
import { sql as getSql } from "~/db";
import { runMigrations } from "./migrate";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DbChild {
  id: number;
  name: string;
  birth_date: string;
  created_at: string;
  account_id: number | null;
}

export interface DbWord {
  id: number;
  child_id: number;
  word: string;
  date_added: string;
  type: "sound" | "approximation" | "word";
}

export interface DbAccount {
  id: number;
  email: string;
  session_token: string;
  is_premium: boolean;
  created_at: string;
  last_login_at: string;
}

// ── Account operations ─────────────────────────────────────────────────────

export const createAccount = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const token = crypto.randomUUID();
      const rows = await sql`
        INSERT INTO accounts (email, session_token)
        VALUES (${data.email.toLowerCase().trim()}, ${token})
        ON CONFLICT (email) DO UPDATE SET
          session_token = ${token},
          last_login_at = NOW()
        RETURNING id, session_token, is_premium
      `;
      const row = rows[0];
      return {
        id: Number(row.id) as number,
        sessionToken: String(row.session_token) as string,
        isPremium: Boolean(row.is_premium) as boolean,
      };
    } catch (e) {
      console.error("createAccount failed:", e);
      return { error: "Database unavailable." };
    }
  });

export const getAccountByEmail = createServerFn({ method: "GET" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT id, email, session_token, is_premium, created_at, last_login_at
        FROM accounts
        WHERE email = ${data.email.toLowerCase().trim()}
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: Number(row.id),
        email: String(row.email),
        sessionToken: String(row.session_token),
        isPremium: Boolean(row.is_premium),
      };
    } catch (e) {
      console.error("getAccountByEmail failed:", e);
      return null;
    }
  });

export const getAccountByToken = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      // Update last_login_at
      await sql`
        UPDATE accounts SET last_login_at = NOW()
        WHERE session_token = ${data.token}
      `;
      const rows = await sql`
        SELECT a.id, a.email, a.session_token, a.is_premium,
               c.id AS child_id, c.name AS child_name, c.birth_date AS child_birth_date
        FROM accounts a
        LEFT JOIN children c ON c.account_id = a.id
        WHERE a.session_token = ${data.token}
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: Number(row.id),
        email: String(row.email),
        sessionToken: String(row.session_token),
        isPremium: Boolean(row.is_premium),
        childId: row.child_id ? Number(row.child_id) : null,
        childName: row.child_name ? String(row.child_name) : null,
        childBirthDate: row.child_birth_date ? String(row.child_birth_date) : null,
      };
    } catch (e) {
      console.error("getAccountByToken failed:", e);
      return null;
    }
  });

export const updateSessionToken = createServerFn({ method: "POST" })
  .validator((data: { accountId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const token = crypto.randomUUID();
      await sql`
        UPDATE accounts SET session_token = ${token}, last_login_at = NOW()
        WHERE id = ${data.accountId}
      `;
      return { sessionToken: token };
    } catch (e) {
      console.error("updateSessionToken failed:", e);
      return { error: "Database unavailable." };
    }
  });

export const setPremium = createServerFn({ method: "POST" })
  .validator((data: { accountId: number; value: boolean }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        UPDATE accounts SET is_premium = ${data.value}
        WHERE id = ${data.accountId}
      `;
    } catch (e) {
      console.error("setPremium failed:", e);
    }
  });

export const linkChildToAccount = createServerFn({ method: "POST" })
  .validator((data: { childId: number; accountId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        UPDATE children SET account_id = ${data.accountId}
        WHERE id = ${data.childId}
      `;
    } catch (e) {
      console.error("linkChildToAccount failed:", e);
    }
  });

export const getChildByAccount = createServerFn({ method: "GET" })
  .validator((data: { accountId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT id, name, birth_date, created_at, account_id
        FROM children
        WHERE account_id = ${data.accountId}
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: Number(row.id),
        name: String(row.name),
        birth_date: String(row.birth_date),
        created_at: String(row.created_at),
        account_id: row.account_id ? Number(row.account_id) : null,
      } satisfies DbChild;
    } catch (e) {
      console.error("getChildByAccount failed:", e);
      return null;
    }
  });

export const getChildrenByAccount = createServerFn({ method: "GET" })
  .validator((data: { accountId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT id, name, birth_date, created_at, account_id
        FROM children
        WHERE account_id = ${data.accountId}
        ORDER BY created_at ASC
      `;
      return rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        birth_date: String(row.birth_date),
        created_at: String(row.created_at),
        account_id: row.account_id ? Number(row.account_id) : null,
      })) as DbChild[];
    } catch (e) {
      console.error("getChildrenByAccount failed:", e);
      return [];
    }
  });

// ── Child operations ───────────────────────────────────────────────────────

export const createChild = createServerFn({ method: "POST" })
  .validator(
    (data: { name: string; birthDate: string; accountId?: number }) => data,
  )
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        INSERT INTO children (name, birth_date, account_id)
        VALUES (${data.name}, ${data.birthDate}, ${data.accountId ?? null})
        RETURNING id
      `;
      const id: number = rows[0].id;
      return { id };
    } catch (e) {
      console.error("createChild failed:", e);
      return { error: "Database unavailable — child saved to device only." };
    }
  });

export const getChild = createServerFn({ method: "GET" })
  .validator((data: { childId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT id, name, birth_date, created_at, account_id
        FROM children
        WHERE id = ${data.childId}
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: Number(row.id),
        name: String(row.name),
        birth_date: String(row.birth_date),
        created_at: String(row.created_at),
        account_id: row.account_id ? Number(row.account_id) : null,
      } satisfies DbChild;
    } catch (e) {
      console.error("getChild failed:", e);
      return null;
    }
  });

export const updateChild = createServerFn({ method: "POST" })
  .validator(
    (data: { childId: number; name: string; birthDate: string }) => data,
  )
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        UPDATE children
        SET name = ${data.name}, birth_date = ${data.birthDate}
        WHERE id = ${data.childId}
      `;
    } catch (e) {
      console.error("updateChild failed:", e);
    }
  });

// ── Word operations ─────────────────────────────────────────────────────────

export const addWord = createServerFn({ method: "POST" })
  .validator(
    (data: { childId: number; word: string; type?: string }) => data,
  )
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const wordType = data.type ?? "word";
      await sql`
        INSERT INTO words (child_id, word, type)
        VALUES (${data.childId}, ${data.word}, ${wordType})
      `;
    } catch (e) {
      console.error("addWord failed:", e);
    }
  });

export const getWords = createServerFn({ method: "GET" })
  .validator((data: { childId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT word FROM words
        WHERE child_id = ${data.childId}
        ORDER BY date_added ASC
      `;
      return rows.map((r) => String(r.word)) as string[];
    } catch (e) {
      console.error("getWords failed:", e);
      return [];
    }
  });

export const deleteWord = createServerFn({ method: "POST" })
  .validator((data: { childId: number; word: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        DELETE FROM words
        WHERE child_id = ${data.childId} AND word = ${data.word}
      `;
    } catch (e) {
      console.error("deleteWord failed:", e);
    }
  });

// ── Analytics operations ──────────────────────────────────────────────────

export const logSession = createServerFn({ method: "POST" })
  .validator((data: { accountId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        INSERT INTO sessions (account_id)
        VALUES (${data.accountId})
      `;
    } catch (e) {
      console.error("logSession failed:", e);
    }
  });

// ── Promo code operations ──────────────────────────────────────────────────

export const redeemPromoCode = createServerFn({ method: "POST" })
  .validator((data: { email: string; code: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const normalizedEmail = data.email.toLowerCase().trim();
      const normalizedCode = data.code.trim();

      // Find or create account
      let rows = await sql`
        SELECT id, is_premium FROM accounts
        WHERE email = ${normalizedEmail}
      `;
      let accountId: number;
      let isAlreadyPremium: boolean;

      if (rows.length === 0) {
        // Create account for this email (setup-flow scenario)
        const token = crypto.randomUUID();
        const created = await sql`
          INSERT INTO accounts (email, session_token)
          VALUES (${normalizedEmail}, ${token})
          RETURNING id, is_premium
        `;
        accountId = Number(created[0].id);
        isAlreadyPremium = Boolean(created[0].is_premium);
      } else {
        accountId = Number(rows[0].id);
        isAlreadyPremium = Boolean(rows[0].is_premium);
      }

      if (isAlreadyPremium) {
        return { success: false, message: "You're already on the Premium plan!" };
      }

      // Look up promo code (case-insensitive match)
      const promoRows = await sql`
        SELECT id, max_uses, current_uses, is_active
        FROM promo_codes
        WHERE LOWER(code) = LOWER(${normalizedCode})
      `;

      if (promoRows.length === 0) {
        return { success: false, message: "That promo code doesn't exist." };
      }

      const promo = promoRows[0];

      if (!promo.is_active) {
        return { success: false, message: "That promo code is no longer active." };
      }

      if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
        return { success: false, message: "That promo code has reached its usage limit." };
      }

      // Valid — set premium and increment uses
      await sql`
        UPDATE accounts SET is_premium = true
        WHERE id = ${accountId}
      `;

      await sql`
        UPDATE promo_codes SET current_uses = current_uses + 1
        WHERE id = ${promo.id}
      `;

      return { success: true, message: "Promo code applied! You now have Premium access. 🌱" };
    } catch (e) {
      console.error("redeemPromoCode failed:", e);
      return { success: false, message: "Something went wrong. Please try again." };
    }
  });

export const logPhraseViews = createServerFn({ method: "POST" })
  .validator(
    (data: {
      views: {
        accountId: number;
        childId: number;
        phraseText: string;
        context: string;
        wasRefreshed: boolean;
      }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      for (const view of data.views) {
        await sql`
          INSERT INTO phrase_views (account_id, child_id, phrase_text, context, was_refreshed)
          VALUES (${view.accountId}, ${view.childId}, ${view.phraseText}, ${view.context}, ${view.wasRefreshed})
        `;
      }
    } catch (e) {
      console.error("logPhraseViews failed:", e);
    }
  });
