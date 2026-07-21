/**
 * Stripe webhook — automates premium activation (the old flow was manual).
 *
 * Setup (Stripe Dashboard → Developers → Webhooks):
 *   endpoint  https://<domain>/api/stripe-webhook
 *   events    checkout.session.completed, customer.subscription.deleted
 * Env:
 *   STRIPE_WEBHOOK_SECRET  (whsec_… from the webhook endpoint page) — required
 *   STRIPE_SECRET_KEY      (sk_…) — optional; needed only to resolve the
 *                          customer email on subscription cancellations
 *
 * Signature verification is implemented directly (HMAC-SHA256 per
 * https://stripe.com/docs/webhooks/signatures) to avoid pulling in the full
 * Stripe SDK for one endpoint.
 */
import { createFileRoute } from "@tanstack/react-router";

const TOLERANCE_SECONDS = 5 * 60;

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parts = new Map<string, string[]>();
  for (const kv of signatureHeader.split(",")) {
    const [k, v] = kv.split("=", 2);
    if (!k || !v) continue;
    const list = parts.get(k.trim()) ?? [];
    list.push(v.trim());
    parts.set(k.trim(), list);
  }

  const timestamp = parts.get("t")?.[0];
  const signatures = parts.get("v1") ?? [];
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (isNaN(age) || age > TOLERANCE_SECONDS) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    return (
      sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

async function setPremiumByEmail(
  email: string,
  value: boolean,
): Promise<void> {
  const { sql: getSql } = await import("~/db");
  const sql = getSql();
  const normalized = email.toLowerCase().trim();
  if (value) {
    // Upsert: if they paid before ever opening the app, the premium flag is
    // waiting for them when they sign up with the same email.
    await sql`
      INSERT INTO accounts (email, session_token, is_premium)
      VALUES (${normalized}, ${crypto.randomUUID()}, true)
      ON CONFLICT (email) DO UPDATE SET is_premium = true
    `;
  } else {
    await sql`
      UPDATE accounts SET is_premium = false WHERE email = ${normalized}
    `;
  }
}

/** Resolve a Stripe customer's email via the API (cancellation events don't carry it) */
async function fetchCustomerEmail(customerId: string): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const customer = (await res.json()) as { email?: string | null };
    return customer.email ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
          console.error("stripe-webhook: STRIPE_WEBHOOK_SECRET not set");
          return new Response("Webhook not configured", { status: 500 });
        }
        if (!process.env.DATABASE_URL) {
          return new Response("No database", { status: 500 });
        }

        const payload = await request.text();
        const valid = await verifyStripeSignature(
          payload,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!valid) {
          return new Response("Invalid signature", { status: 400 });
        }

        let event: {
          type?: string;
          data?: {
            object?: {
              customer_details?: { email?: string | null };
              customer_email?: string | null;
              customer?: string | null;
              payment_status?: string;
            };
          };
        };
        try {
          event = JSON.parse(payload);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        try {
          const { runMigrations } = await import("~/db/migrate");
          await runMigrations();

          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data?.object;
              const email =
                session?.customer_details?.email ?? session?.customer_email;
              // Payment links complete with payment_status "paid"
              if (email && session?.payment_status !== "unpaid") {
                await setPremiumByEmail(email, true);
                console.log(`stripe-webhook: premium activated for ${email}`);
              }
              break;
            }
            case "customer.subscription.deleted": {
              const customerId = event.data?.object?.customer;
              if (customerId) {
                const email = await fetchCustomerEmail(customerId);
                if (email) {
                  await setPremiumByEmail(email, false);
                  console.log(`stripe-webhook: premium ended for ${email}`);
                } else {
                  console.warn(
                    "stripe-webhook: could not resolve customer email for cancellation (set STRIPE_SECRET_KEY); downgrade manually:",
                    customerId,
                  );
                }
              }
              break;
            }
            default:
              // Other events are fine to acknowledge and ignore
              break;
          }
        } catch (e) {
          console.error("stripe-webhook: handler failed", e);
          // 500 so Stripe retries
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
