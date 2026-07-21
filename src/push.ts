/**
 * Client-side Web Push helpers: service worker registration, subscribe /
 * unsubscribe, and permission state. The server side lives in
 * src/routes/api/push-daily.ts (daily send) and db/queries.ts (subscription
 * storage + VAPID public key).
 */

export type PushState =
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "subscribed" : "unsubscribed";
  } catch {
    return "unsubscribed";
  }
}

/** Convert a base64url VAPID key into the Uint8Array PushManager expects */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Subscribe this browser to the daily phrase reminder.
 * Returns the new state ("subscribed" on success).
 */
export async function subscribeToPush(accountId: number): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";

  const { getVapidPublicKey, savePushSubscription } = await import(
    "~/db/queries"
  );
  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return "unsupported"; // server not configured for push

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const reg =
    (await navigator.serviceWorker.getRegistration()) ??
    (await registerServiceWorker());
  if (!reg) return "unsupported";

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return "unsubscribed";
    }
    const result = await savePushSubscription({
      data: {
        accountId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    });
    return result.success ? "subscribed" : "unsubscribed";
  } catch {
    return "unsubscribed";
  }
}

export async function unsubscribeFromPush(): Promise<PushState> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      const { deletePushSubscription } = await import("~/db/queries");
      await deletePushSubscription({ data: { endpoint } }).catch(() => {});
    }
    return "unsubscribed";
  } catch {
    return "unsubscribed";
  }
}
