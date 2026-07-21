/**
 * WordBloom service worker: PWA installability + Web Push.
 * Deliberately no fetch caching — the app is small and a stale shell is worse
 * than a network round-trip.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // non-JSON payload — use defaults
  }
  const title = data.title || "WordBloom 🌱";
  const options = {
    body: data.body || "Today's phrases are ready — a fresh way to grow your child's words.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "wordbloom-daily",
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if ("focus" in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
