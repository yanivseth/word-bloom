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

// ── Magic-link login ───────────────────────────────────────────────────────

/** Base URL for links in emails. Derived server-side — never from the client,
 * so a forged origin can't redirect a login token to an attacker. */
function siteBaseUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function magicLinkEmailHtml(link: string, isNew: boolean): string {
  const intro = isNew
    ? "Welcome to WordBloom! Confirm your email to secure your account and sign in on any device:"
    : "Here's your secure link to sign in to WordBloom:";
  return `<!doctype html><html><body style="margin:0;background:#fefdfb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#384231;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;text-align:center;">
      <div style="font-size:44px;">🌱</div>
      <h1 style="font-size:22px;color:#43503b;margin:12px 0 4px;">WordBloom</h1>
      <p style="color:#56644a;line-height:1.6;margin:20px 0;">${intro}</p>
      <a href="${link}" style="display:inline-block;background:#9575c2;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:9999px;">Sign in to WordBloom</a>
      <p style="color:#8a9a79;font-size:13px;line-height:1.6;margin-top:28px;">This link expires in 30 minutes and can be used once. If you didn't request it, you can safely ignore this email — no changes were made.</p>
      <p style="color:#a8b59a;font-size:12px;margin-top:24px;word-break:break-all;">Or paste this link:<br>${link}</p>
    </div></body></html>`;
}

type EmailResult =
  | { sent: true }
  | { sent: false; reason: "no_key" }
  | { sent: false; reason: "api_error"; error: string };

/** Send an email via Resend. Returns a discriminated union so callers can
 * distinguish "not configured" (valid degraded mode) from "configured but
 * failed" (a real error that must be surfaced to the user). */
async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "no_key" };
  const from = process.env.EMAIL_FROM ?? "WordBloom <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend send failed:", res.status, body);
      return { sent: false, reason: "api_error", error: `Resend returned ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("Resend send error:", e);
    return { sent: false, reason: "api_error", error: String(e) };
  }
}

/**
 * Request a magic sign-in link for an email.
 *
 * Returns `{ isNew }` so the caller knows whether this is a fresh account.
 * When email delivery is NOT configured (`RESEND_API_KEY` unset), returns a
 * `devToken` so the client can complete sign-in without email — this preserves
 * the pre-magic-link behavior for the live site until the key is added. Once
 * configured, no token is ever returned to the client and control of the inbox
 * is required.
 */
export const requestMagicLink = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const email = data.email.toLowerCase().trim();
      if (!email || !email.includes("@")) {
        return { ok: false as const, error: "Please enter a valid email." };
      }

      const existing = await sql`SELECT id FROM accounts WHERE email = ${email}`;
      const isNew = existing.length === 0;

      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(
        /-/g,
        "",
      );
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await sql`
        INSERT INTO magic_tokens (email, token, expires_at)
        VALUES (${email}, ${token}, ${expiresAt})
      `;

      const link = `${siteBaseUrl()}/auth/verify?token=${token}`;
      const emailResult = await sendEmailViaResend(
        email,
        isNew ? "Confirm your WordBloom account 🌱" : "Your WordBloom sign-in link 🌱",
        magicLinkEmailHtml(link, isNew),
      );

      if (emailResult.sent) {
        return { ok: true as const, sent: true, isNew };
      }

      if (emailResult.reason === "no_key") {
        // Degraded mode: no email provider configured — hand the token back so
        // the client can finish (equivalent to the old email-as-identity flow).
        return { ok: true as const, sent: false, isNew, devToken: token };
      }

      // api_error: the provider is configured but the send failed — surface
      // the error; do NOT return a devToken that would bypass email verification.
      return { ok: false as const, error: `Failed to send email: ${emailResult.error}` };
    } catch (e) {
      console.error("requestMagicLink failed:", e);
      return { ok: false as const, error: "Something went wrong. Please try again." };
    }
  });

/**
 * Verify a magic token: checks it's unexpired and unused, marks it used, then
 * upserts the account and rotates its session token. Returns the account +
 * linked child so the client can hydrate.
 */
export const verifyMagicLink = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const token = data.token.trim();
      if (!token) return { ok: false as const, reason: "invalid" as const };

      // Atomically claim the token: only succeeds if unused and unexpired.
      const claimed = await sql`
        UPDATE magic_tokens
        SET used_at = NOW()
        WHERE token = ${token}
          AND used_at IS NULL
          AND expires_at > NOW()
        RETURNING email
      `;
      if (claimed.length === 0) {
        // Distinguish expired/used from never-existed for a clearer message.
        const exists = await sql`SELECT used_at, expires_at FROM magic_tokens WHERE token = ${token}`;
        if (exists.length === 0) return { ok: false as const, reason: "invalid" as const };
        return { ok: false as const, reason: "expired" as const };
      }

      const email = String(claimed[0].email).toLowerCase().trim();

      // Upsert account + rotate session token
      const sessionToken = crypto.randomUUID();
      const rows = await sql`
        INSERT INTO accounts (email, session_token)
        VALUES (${email}, ${sessionToken})
        ON CONFLICT (email) DO UPDATE SET
          session_token = ${sessionToken},
          last_login_at = NOW()
        RETURNING id, is_premium
      `;
      const accountId = Number(rows[0].id);
      const isPremium = Boolean(rows[0].is_premium);

      // Best-effort cleanup of this email's spent/expired tokens
      await sql`
        DELETE FROM magic_tokens
        WHERE email = ${email} AND (used_at IS NOT NULL OR expires_at < NOW())
      `.catch(() => {});

      // Linked child (first, if any)
      const childRows = await sql`
        SELECT id, name, birth_date FROM children
        WHERE account_id = ${accountId}
        ORDER BY created_at ASC LIMIT 1
      `;
      const child = childRows[0];

      return {
        ok: true as const,
        sessionToken,
        id: accountId,
        email,
        isPremium,
        childId: child ? Number(child.id) : null,
        childName: child ? String(child.name) : null,
        childBirthDate: child ? String(child.birth_date) : null,
      };
    } catch (e) {
      console.error("verifyMagicLink failed:", e);
      return { ok: false as const, reason: "error" as const };
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
    (data: { childId: number; word: string; type?: string; source?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const wordType = data.type ?? "word";
      const source = data.source === "suggestion" ? "suggestion" : "manual";
      const normalized = data.word.toLowerCase().trim();
      // Check for existing word (case-insensitive) before inserting to avoid
      // duplicates — the words table has no UNIQUE constraint on (child_id, word).
      const existing = await sql`
        SELECT id FROM words
        WHERE child_id = ${data.childId} AND LOWER(word) = ${normalized}
        LIMIT 1
      `;
      if (existing.length > 0) return; // Word already exists — skip
      await sql`
        INSERT INTO words (child_id, word, type, source)
        VALUES (${data.childId}, ${normalized}, ${wordType}, ${source})
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
        SELECT DISTINCT ON (LOWER(word)) word, date_added FROM words
        WHERE child_id = ${data.childId}
        ORDER BY LOWER(word), date_added ASC
      `;
      return rows.map((r) => String(r.word)) as string[];
    } catch (e) {
      console.error("getWords failed:", e);
      return [];
    }
  });

export const getWordsWithDates = createServerFn({ method: "GET" })
  .validator((data: { childId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT DISTINCT ON (LOWER(word)) word, date_added, source FROM words
        WHERE child_id = ${data.childId}
        ORDER BY LOWER(word), date_added ASC
      `;
      return rows.map((r) => ({
        word: String(r.word),
        dateAdded: String(r.date_added),
        source: String(r.source ?? "manual"),
      }));
    } catch (e) {
      console.error("getWordsWithDates failed:", e);
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
        WHERE child_id = ${data.childId} AND LOWER(word) = LOWER(${data.word})
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

/**
 * Distinct local-date day keys (YYYY-MM-DD, UTC) this account visited the
 * dashboard, newest first. Used to compute the parent's "bloom streak".
 */
export const getSessionDays = createServerFn({ method: "GET" })
  .validator((data: { accountId: number }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT DISTINCT TO_CHAR(started_at, 'YYYY-MM-DD') AS day
        FROM sessions
        WHERE account_id = ${data.accountId}
        ORDER BY day DESC
        LIMIT 90
      `;
      return rows.map((r) => String(r.day)) as string[];
    } catch (e) {
      console.error("getSessionDays failed:", e);
      return [];
    }
  });

// ── Push subscription operations ──────────────────────────────────────────

export const savePushSubscription = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accountId: number;
      endpoint: string;
      p256dh: string;
      auth: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        INSERT INTO push_subscriptions (account_id, endpoint, p256dh, auth)
        VALUES (${data.accountId}, ${data.endpoint}, ${data.p256dh}, ${data.auth})
        ON CONFLICT (endpoint) DO UPDATE SET
          account_id = ${data.accountId},
          p256dh = ${data.p256dh},
          auth = ${data.auth}
      `;
      return { success: true };
    } catch (e) {
      console.error("savePushSubscription failed:", e);
      return { success: false };
    }
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .validator((data: { endpoint: string }) => data)
  .handler(async ({ data }) => {
    await runMigrations();
    try {
      const sql = getSql();
      await sql`
        DELETE FROM push_subscriptions WHERE endpoint = ${data.endpoint}
      `;
    } catch (e) {
      console.error("deletePushSubscription failed:", e);
    }
  });

/** The VAPID public key the client needs to subscribe to push (or null). */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(
  async () => {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  },
);

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
