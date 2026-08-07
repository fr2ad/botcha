import { CONFIG } from '../config.js';
import { connections, send } from './connections.js';
import { canAffordEntry, spendHeartOrCoin } from '../db/index.js';
import { Room } from './room.js';

const queue: string[] = [];
export const activeRooms = new Map<string, Room>();

function broadcastQueue() {
  const msg = { type: 'queue.update', onlineCount: connections.size, queueSize: queue.length };
  for (const playerId of queue) send(playerId, msg);
}

export function joinQueue(playerId: string) {
  if (queue.includes(playerId)) return;
  const conn = connections.get(playerId);
  if (conn?.gameId) return; // already in a game
  queue.push(playerId);
  broadcastQueue();
  tryFormRoom();
}

export function leaveQueue(playerId: string) {
  const i = queue.indexOf(playerId);
  if (i !== -1) queue.splice(i, 1);
  broadcastQueue();
}

export function onDisconnect(playerId: string) {
  leaveQueue(playerId);
  for (const room of activeRooms.values()) {
    room.handleDisconnect(playerId);
  }
}

function tryFormRoom() {
  const humansNeeded = CONFIG.seatsPerRoom - CONFIG.botsPerRoom;

  // Drop anyone who can no longer afford to play (e.g. ran out mid-wait) so
  // they don't block the rest of the queue forever. They stay disconnected
  // from matchmaking until they buy in some other way.
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!canAffordEntry(queue[i])) {
      const [blocked] = queue.splice(i, 1);
      send(blocked, { type: 'queue.blocked', reason: 'no_hearts_or_coins' });
    }
  }

  while (queue.length >= humansNeeded) {
    const candidates = queue.splice(0, humansNeeded);

    // Charge only after we know exactly `humansNeeded` players are being
    // seated — never deduct a Heart/Coin from someone who ends up requeued.
    const paid: string[] = [];
    for (const playerId of candidates) {
      const result = spendHeartOrCoin(playerId);
      if ('error' in result) {
        send(playerId, { type: 'queue.blocked', reason: 'no_hearts_or_coins' });
      } else {
        paid.push(playerId);
      }
    }

    if (paid.length < humansNeeded) {
      // Someone became unable to pay between the affordability sweep above
      // and now (race with another queue join) — nobody was charged twice,
      // just retry with whoever is left.
      continue;
    }

    const room = new Room(paid);
    activeRooms.set(room.id, room);
    room
      .run()
      .catch((err) => console.error('[room] crashed', room.id, err))
      .finally(() => activeRooms.delete(room.id));
  }
  broadcastQueue();
}
