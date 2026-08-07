import type { WebSocket } from 'ws';

export type Conn = {
  playerId: string;
  ws: WebSocket;
  gameId: string | null;
  pendingTurnResolve?: (text: string | null) => void;
  pendingGuessResolve?: (seatIndex: number | null) => void;
};

export const connections = new Map<string, Conn>();

export function send(playerId: string, msg: unknown) {
  const conn = connections.get(playerId);
  if (!conn || conn.ws.readyState !== conn.ws.OPEN) return;
  conn.ws.send(JSON.stringify(msg));
}
