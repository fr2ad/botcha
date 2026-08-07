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

export function mockLogin(nickname: string, avatar: string) {
  return req<{ player: Player }>('/api/auth/mock-login', {
    method: 'POST',
    body: JSON.stringify({ nickname, avatar })
  });
}

export function fetchPlayer(id: string) {
  return req<{ player: Player }>(`/api/players/${id}`);
}

export function fetchLeaderboard() {
  return req<{ players: LeaderboardEntry[] }>('/api/leaderboard');
}

export function wsUrl(playerId: string) {
  const base = API_BASE || window.location.origin;
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.searchParams.set('playerId', playerId);
  return url.toString();
}
