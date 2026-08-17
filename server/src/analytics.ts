import { GA4_API_SECRET, GA4_MEASUREMENT_ID } from './config.js';

// GA4 Measurement Protocol — a plain HTTPS POST, no SDK needed. Used for
// server-only facts (like exact Bot count) that must never ship to the
// client bundle or the network the Player's own browser can see, since the
// whole game depends on Bot count staying hidden from them (SPEC §4).
// Fire-and-forget: an analytics hiccup should never affect the game.
export function trackServerEvent(name: string, params: Record<string, unknown>, clientId: string) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return;
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, events: [{ name, params }] })
  }).catch((err) => console.error('[analytics] event failed', name, err));
}
