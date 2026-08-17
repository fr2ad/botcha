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

// Registers this browser for push (hearts-refill notifications, see
// server/src/scheduler.ts). Call after login, once — it prompts the browser's
// native permission dialog, so don't call it from anywhere that isn't a
// direct response to the player already being in the app.
export async function enablePushNotifications(playerId: string) {
  if (!app || !(await messagingSupported())) return;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    // The same sw.js main.tsx already registers for installability — a
    // second worker at the same scope would just replace it. See its
    // FIREBASE_CONFIG comment for the background-push half of this.
    const registration = await navigator.serviceWorker.register('/sw.js');
    messaging ??= getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (token) await registerFcmToken(playerId, token);
  } catch (err) {
    // Notification permission denied, no service worker support, or a
    // flaky FCM registration — push is a nice-to-have, never block on it.
    console.error('[push] failed to enable', err);
  }
}
