import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported, logEvent, type Analytics } from 'firebase/analytics';
import { getMessaging, getToken, isSupported as messagingSupported, type Messaging } from 'firebase/messaging';
import { registerFcmToken } from './api';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// No Firebase project configured (the common case until one's set up) ->
// every export below is a safe no-op, same pattern as the bot's missing
// OPENROUTER_API_KEY fallback.
const app: FirebaseApp | null = config.apiKey ? initializeApp(config) : null;

let analytics: Analytics | null = null;
if (app) {
  analyticsSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {});
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (analytics) logEvent(analytics, name, params);
}

let messaging: Messaging | null = null;

export type PushStatus =
  | 'unavailable' // no Firebase config, or the browser has no push support at all
  | 'needs-install' // iOS: web push only exists once the PWA is on the Home Screen
  | 'default' // can be asked
  | 'granted'
  | 'denied';

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own non-standard flag, still the only way to detect it there
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!app || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return 'unavailable';
  if (!(await messagingSupported())) {
    // iOS gained web push in 16.4, but only for Home Screen installs — in a
    // plain Safari tab isSupported() is false and there is nothing to prompt.
    // Worth telling the player that rather than silently doing nothing.
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return iOS && !isStandalone() ? 'needs-install' : 'unavailable';
  }
  return Notification.permission as PushStatus;
}

// Asks for notification permission and registers the FCM token (hearts-refill
// pushes, see server/src/scheduler.ts).
//
// MUST be called from a real user gesture — a click handler, not an effect.
// Safari, desktop and iOS both, silently refuses requestPermission() without
// transient user activation, which is exactly why calling this on mount
// showed no prompt at all.
export async function enablePushNotifications(playerId: string): Promise<PushStatus> {
  const status = await getPushStatus();
  if (status !== 'default' && status !== 'granted') return status;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission as PushStatus;
    // The same sw.js main.tsx already registers for installability — a
    // second worker at the same scope would just replace it. See its
    // FIREBASE_CONFIG comment for the background-push half of this.
    const registration = await navigator.serviceWorker.register('/sw.js');
    messaging ??= getMessaging(app!);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (token) await registerFcmToken(playerId, token);
    return 'granted';
  } catch (err) {
    // Permission dismissed, no service worker, or a flaky FCM registration —
    // push is a nice-to-have, never block on it.
    console.error('[push] failed to enable', err);
    return 'unavailable';
  }
}
