/**
 * Daily push sender — hit once a day by the Vercel cron (see vercel.json /
 * build-vercel.sh config.json "crons"). Sends the "today's phrases are ready"
 * reminder to every stored push subscription.
 *
 * Requires env:
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  (npx web-push generate-vapid-keys)
 *   VAPID_SUBJECT                          (mailto:you@example.com)
 *   CRON_SECRET                            (optional; Vercel sends it as a
 *                                           Bearer token when set)
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/push-daily")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Auth: when CRON_SECRET is configured, only the cron may call this.
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
          const auth = request.headers.get("authorization");
          if (auth !== `Bearer ${cronSecret}`) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@wordbloom.app";
        if (!publicKey || !privateKey) {
          return Response.json(
            { sent: 0, error: "VAPID keys not configured" },
            { status: 200 },
          );
        }
        if (!process.env.DATABASE_URL) {
          return Response.json({ sent: 0, error: "no database" }, { status: 200 });
        }

        const [{ default: webpush }, { sql: getSql }] = await Promise.all([
          import("web-push"),
          import("~/db"),
        ]);
        webpush.setVapidDetails(subject, publicKey, privateKey);

        const sql = getSql();
        // Each subscription with the account's (first) child name for a
        // personal touch in the notification body.
        const subs = await sql`
          SELECT ps.endpoint, ps.p256dh, ps.auth,
                 (SELECT c.name FROM children c
                  WHERE c.account_id = ps.account_id
                  ORDER BY c.created_at ASC LIMIT 1) AS child_name
          FROM push_subscriptions ps
        `;

        let sent = 0;
        let removed = 0;
        for (const sub of subs) {
          const childName = sub.child_name ? String(sub.child_name) : null;
          const payload = JSON.stringify({
            title: "WordBloom 🌱",
            body: childName
              ? `Today's phrases for ${childName} are ready — 20 seconds to grow new words.`
              : "Today's phrases are ready — 20 seconds to grow new words.",
            url: "/dashboard",
          });
          try {
            await webpush.sendNotification(
              {
                endpoint: String(sub.endpoint),
                keys: { p256dh: String(sub.p256dh), auth: String(sub.auth) },
              },
              payload,
            );
            sent++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            // 404/410 = subscription expired or revoked — clean it up
            if (status === 404 || status === 410) {
              await sql`
                DELETE FROM push_subscriptions
                WHERE endpoint = ${String(sub.endpoint)}
              `.catch(() => {});
              removed++;
            }
          }
        }

        return Response.json({ sent, removed, total: subs.length });
      },
    },
  },
});
