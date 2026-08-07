import type { FastifyInstance } from 'fastify';
import { connections } from '../game/connections.js';
import { joinQueue, leaveQueue, onDisconnect, activeRooms } from '../game/queue.js';
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

    connections.set(playerId, { playerId, ws: socket, gameId: null });

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
