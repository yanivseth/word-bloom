# WordBloom Enhancements — Daily-Habit Release

This release turns WordBloom from a phrase generator you *visit* into a daily
ritual: a stable daily edition, a closed learning loop, visible progress, a
notification trigger, and automated billing. Everything below works with **no
new env vars** except the two optional integrations (push + Stripe webhook),
which degrade gracefully when unconfigured.

## What shipped

### 1. Daily edition (the habit core)
Phrase generation is now **deterministic**, seeded on `child + date + edition`.
"Today's phrases" is a stable daily set instead of a slot machine that reshuffles
on every mount.
- Free tier: 1 phrase + **1 reshuffle per day**.
- Premium: 3 phrases + unlimited refreshes + a **context picker** (play / meals /
  bath / bed / outside) that returns phrases actually about that moment.
- With no explicit choice, phrases default to a **time-of-day** context (morning →
  mealtime, evening → bath, night → bedtime).

### 2. "Said it!" loop
Every phrase card has a **🎉 Said "word"!** button. One tap:
- logs the word (with `source = 'suggestion'` — our phrase-effectiveness signal),
- fires a confetti celebration,
- immediately regenerates phrases building on the word the child just said.

### 3. Progress page (`/progress`)
- Cumulative **words-over-time** chart (seeded step chart, hover tooltip, table view).
- **Category coverage** across the 8 CDI semantic categories.
- **CDI age-range framing** — ranges, never verdicts (anxious-parent safe).
- **Shareable milestone card** (canvas → PNG, native share sheet on mobile).
- Weekly recap + streak surface on the dashboard.

### 4. Engine depth
- **Lexicon expanded to 133 words** (added a 45-word 24–36 month tier — animals,
  foods, actions, social words, vehicles, concepts) so it no longer runs out of
  runway at 24 months.
- **Two-word combination layer** (pivot grammar: "more banana", "big dog") for
  18mo+ children with a word base — the developmentally correct next step.
- **Scoring fixes**: exact known words now outrank phonetic neighbors; real
  context filtering (phrase *text* must match the context, not just its label);
  precise day-of-month age math; removed dead `scoreEntry`.

### 5. PWA + Web Push (trigger)
Installable home-screen app + one daily reminder ("today's phrases are ready").

### 6. Stripe webhook (billing)
Premium now activates **automatically** on payment (was manual).

---

## Environment variables

### Already required (unchanged)
- `DATABASE_URL` — Neon Postgres. Everything degrades to localStorage without it.

### Web Push (optional — button hides itself if unset)
Generate a VAPID keypair once:
```bash
npx web-push generate-vapid-keys
```
Set on the host (Vercel project env):
- `VAPID_PUBLIC_KEY` — the public key (also sent to the browser to subscribe).
- `VAPID_PRIVATE_KEY` — the private key. **Server-only, never exposed to the client.**
- `VAPID_SUBJECT` — a contact URI, e.g. `mailto:hello@wordbloom.app`.
- `CRON_SECRET` — optional. When set, `/api/push-daily` requires
  `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends this header
  automatically when the project has a `CRON_SECRET` env var.

The daily send is wired as a Vercel Cron (`vercel.json` + the Build Output API
`config.json` in `build-vercel.sh`) hitting `/api/push-daily` at **13:00 UTC**
daily. Adjust the schedule there.

### Stripe webhook (optional — endpoint 500s until configured)
In the Stripe Dashboard → Developers → Webhooks, add an endpoint:
- **URL**: `https://<your-domain>/api/stripe-webhook`
- **Events**: `checkout.session.completed`, `customer.subscription.deleted`

Then set:
- `STRIPE_WEBHOOK_SECRET` — the `whsec_…` signing secret from that endpoint page.
  **Required** for the webhook to accept any request (signature verification).
- `STRIPE_SECRET_KEY` — the `sk_…` key. *Optional*; only needed to resolve a
  customer's email on **cancellation** events (so premium can be revoked). Without
  it, checkout → premium activation still works fully; cancellations are logged
  for manual downgrade.

`checkout.session.completed` upserts the account by email and sets premium — so a
parent who pays **before** ever signing up gets premium waiting for them when they
enter that email.

---

## Database migrations
All additive and idempotent (run automatically on first DB access):
- `words.source TEXT DEFAULT 'manual'`
- `push_subscriptions` table (+ index)

No manual migration step needed.

## Local verification
```bash
bun run build          # production build
bun run serve.ts       # serves on :3000 (falls back to localStorage w/o DB)
```
