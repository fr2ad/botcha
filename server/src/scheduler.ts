import { refillDueHearts } from './db/index.js';
import { FIREBASE_SERVICE_ACCOUNT_JSON } from './config.js';

// No Firebase project configured -> hearts still refill (getPlayer's own
// lazy check handles that), Players just never get pushed a notification.
let messaging: import('firebase-admin/messaging').Messaging | null = null;

async function getMessaging() {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  if (messaging) return messaging;
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getMessaging: get } = await import('firebase-admin/messaging');
  const app = initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON)) });
  messaging = get(app);
  return messaging;
}

async function sweep() {
  const refilled = refillDueHearts();
  if (refilled.length === 0) return;
  const fcm = await getMessaging();
  if (!fcm) return;
  for (const { fcmToken } of refilled) {
    fcm
      .send({
        token: fcmToken,
        notification: { title: 'Botcha', body: 'Your hearts refilled — go find a bot ❤️' }
      })
      // An expired/unregistered token is expected churn (uninstalled PWA,
      // revoked permission) — not worth crashing the sweep over.
      .catch((err) => console.error('[scheduler] push failed', err));
  }
}

// A daily reset only needs checking a few times an hour, not continuously —
// ponytail: fixed interval, not aligned to UTC midnight, so worst case a
// refill's push is up to this long late. Tighten if that's ever noticeable.
const SWEEP_INTERVAL_MS = 15 * 60_000;

export function startScheduler() {
  sweep().catch((err) => console.error('[scheduler] sweep failed', err));
  setInterval(() => sweep().catch((err) => console.error('[scheduler] sweep failed', err)), SWEEP_INTERVAL_MS);
}
