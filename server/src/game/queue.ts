import { CONFIG } from '../config.js';
import { connections, send } from './connections.js';
import { canAffordEntry, spendHeartOrCoin } from '../db/index.js';
import { Room } from './room.js';

type QueueEntry = { playerId: string; joinedAt: number };

const queue: QueueEntry[] = [];
export const activeRooms = new Map<string, Room>();

// A room never has 0 Bots (there'd be nothing to hunt) or seatsPerRoom Bots
// (a Player needs a table). Real humans fill first, up to MAX_HUMANS; a
// timed-out wait fills whatever's left with Bots, down to just one Player.
const MAX_HUMANS = CONFIG.seatsPerRoom - 1;

let fillTimer: ReturnType<typeof setTimeout> | null = null;

// Goes to everyone connected, not just the queue — the home screen shows the
// online count too, and it would otherwise sit at 0 until you queued up.
export function broadcastQueue() {
  const msg = { type: 'queue.update', onlineCount: connections.size, queueSize: queue.length };
  for (const playerId of connections.keys()) send(playerId, msg);
}

export function joinQueue(playerId: string) {
  if (queue.some((e) => e.playerId === playerId)) return;
  const conn = connections.get(playerId);
  if (conn?.gameId) return; // already in a game
  queue.push({ playerId, joinedAt: Date.now() });
  broadcastQueue();
  tryFormRoom();
}

export function leaveQueue(playerId: string) {
  const i = queue.findIndex((e) => e.playerId === playerId);
  if (i !== -1) queue.splice(i, 1);
  broadcastQueue();
  scheduleFill();
}

// Same liveness condition handleDisconnect already uses — a room mid
// roster/chat/guess/reveal still has a seat worth reconnecting into; one
// that's finished or cancelled does not (see Room.handleDisconnect).
export function findActiveSeat(playerId: string) {
  for (const room of activeRooms.values()) {
    if (room.phase === 'result' || room.phase === 'cancelled') continue;
    const seat = room.seats.find((s) => s.kind === 'human' && s.playerId === playerId);
    if (seat) return { room, seat };
  }
  return null;
}

export function onDisconnect(playerId: string) {
  leaveQueue(playerId);
  for (const room of activeRooms.values()) {
    room.handleDisconnect(playerId);
  }
}

function tryFormRoom() {
  // Drop anyone who can no longer afford to play (e.g. ran out mid-wait) so
  // they don't block the rest of the queue forever. They stay disconnected
  // from matchmaking until they buy in some other way.
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!canAffordEntry(queue[i].playerId)) {
      const [blocked] = queue.splice(i, 1);
      send(blocked.playerId, { type: 'queue.blocked', reason: 'no_hearts_or_coins' });
    }
  }

  // Prefer a full human table whenever there are enough real opponents
  // waiting — Bots only step in to cover a gap, never to replace someone
  // who's actually there.
  while (queue.length >= MAX_HUMANS) {
    seatRoom(MAX_HUMANS);
  }

  scheduleFill();
  broadcastQueue();
}

// Charges only players who are actually being seated, then hands whatever
// humans it got to Room — Room fills any remaining seats with Bots, so a
// short-of-MAX_HUMANS batch (partial payment failure, or a timed-out solo
// wait) still produces a valid game instead of stalling the queue.
function seatRoom(humanCount: number) {
  const candidates = queue.splice(0, humanCount);
  const paid: string[] = [];
  for (const entry of candidates) {
    const result = spendHeartOrCoin(entry.playerId);
    if ('error' in result) {
      send(entry.playerId, { type: 'queue.blocked', reason: 'no_hearts_or_coins' });
    } else {
      paid.push(entry.playerId);
    }
  }
  if (paid.length === 0) return;

  const room = new Room(paid);
  activeRooms.set(room.id, room);
  room
    .run()
    .catch((err) => console.error('[room] crashed', room.id, err))
    .finally(() => activeRooms.delete(room.id));
}

// Re-arms a single timer for whoever's been waiting longest, so the queue
// never leaves a Player stranded below MAX_HUMANS forever — it just takes
// longer to get a fully-human table than a bot-filled one.
function scheduleFill() {
  if (fillTimer) clearTimeout(fillTimer);
  fillTimer = null;
  if (queue.length === 0) return;
  const waitLeft = CONFIG.queueFillTimeoutMs - (Date.now() - queue[0].joinedAt);
  fillTimer = setTimeout(fillWithBots, Math.max(0, waitLeft));
}

function fillWithBots() {
  fillTimer = null;
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!canAffordEntry(queue[i].playerId)) {
      const [blocked] = queue.splice(i, 1);
      send(blocked.playerId, { type: 'queue.blocked', reason: 'no_hearts_or_coins' });
    }
  }
  while (queue.length > 0) {
    seatRoom(Math.min(queue.length, MAX_HUMANS));
  }
  broadcastQueue();
}
