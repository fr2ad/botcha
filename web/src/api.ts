import type { LeaderboardEntry, Player } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}

export function mockLogin(nickname: string, avatar: string, inviteCode?: string) {
  return req<{ player: Player }>('/api/auth/mock-login', {
    method: 'POST',
    body: JSON.stringify({ nickname, avatar, inviteCode })
  });
}

export function googleLogin(idToken: string) {
  return req<{ player: Player } | { newGoogleUser: true; googleId: string }>('/api/auth/google-login', {
    method: 'POST',
    body: JSON.stringify({ idToken })
  });
}

export function googleSignup(googleId: string, nickname: string, avatar: string, inviteCode?: string) {
  return req<{ player: Player }>('/api/auth/google-signup', {
    method: 'POST',
    body: JSON.stringify({ googleId, nickname, avatar, inviteCode })
  });
}

export function registerFcmToken(playerId: string, token: string) {
  return req<{ ok: true }>(`/api/players/${playerId}/fcm-token`, {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

export function fetchPlayer(id: string) {
  return req<{ player: Player }>(`/api/players/${id}`);
}

export function updateAvatar(id: string, avatar: string) {
  return req<{ player: Player }>(`/api/players/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ avatar })
  });
}

export function fetchLeaderboard() {
  return req<{ players: LeaderboardEntry[] }>('/api/leaderboard');
}

export function submitFeedback(gameId: string, playerId: string, rating: number, comment?: string) {
  return req<{ ok: true }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerId, rating, comment })
  });
}

export function botTestReply(history: { speaker: string; text: string }[]) {
  return req<{ reply: string; persona: string }>('/api/bot-test/reply', {
    method: 'POST',
    body: JSON.stringify({ history })
  });
}

export function wsUrl(playerId: string) {
  const base = API_BASE || window.location.origin;
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.searchParams.set('playerId', playerId);
  return url.toString();
}
