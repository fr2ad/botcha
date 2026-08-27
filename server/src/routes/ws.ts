import type { FastifyInstance } from 'fastify';
import { connections, send } from '../game/connections.js';
import { broadcastQueue, findActiveSeat, joinQueue, leaveQueue, onDisconnect, activeRooms } from '../game/queue.js';
import { getPlayer } from '../db/index.js';

export function registerWsRoute(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket, req) => {
    const url = new URL(req.url, 'http://localhost');
    const playerId = url.searchParams.get('playerId') ?? '';
    const player = playerId ? getPlayer(playerId) : undefined;

    if (!player) {
      socket.send(JSON.stringify({ type: 'error', message: 'invalid playerId' }));
      socket.close();
      return;
    }

    // A reconnect (reload, network blip) otherwise wiped gameId back to null
    // even while a room was still actively seating this player — this is
    // what let a returning player silently rejoin the queue while their old
    // room kept running unseen. Restore continuity if one is still live;
    // otherwise tell the client explicitly there's nothing to resume.
    const active = findActiveSeat(playerId);
    if (active) {
      active.seat.connected = true;
      connections.set(playerId, { playerId, ws: socket, gameId: active.room.id });
      send(playerId, active.room.snapshotFor(active.seat));
    } else {
      connections.set(playerId, { playerId, ws: socket, gameId: null });
      send(playerId, { type: 'game.none' });
    }
    broadcastQueue(); // new arrival changes the online count everyone sees

    socket.on('message', (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const conn = connections.get(playerId);
      if (!conn) return;

      switch (msg.type) {
        case 'queue.join':
          joinQueue(playerId);
          break;
        case 'queue.leave':
          leaveQueue(playerId);
          break;
        case 'turn.message':
          conn.pendingTurnResolve?.(typeof msg.text === 'string' ? msg.text : null);
          break;
        case 'guess.submit':
          conn.pendingGuessResolve?.(typeof msg.seatIndex === 'number' ? msg.seatIndex : null);
          break;
        default:
          break;
      }
    });

    socket.on('close', () => {
      connections.delete(playerId);
      onDisconnect(playerId);
    });
  });

  void activeRooms;
}
