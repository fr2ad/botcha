import type { Persona } from '../bot/personas.js';

export type SeatKind = 'human' | 'bot';

export type Seat = {
  index: number;
  codeName: string;
  color: string;
  kind: SeatKind;
  playerId: string | null; // null for bot
  nickname: string; // real nickname (human) or fake nickname (bot)
  avatar: string;
  persona: Persona | null; // set for bot seats only — each bot in a room gets its own
  skippedTurns: number;
  silentBadge: boolean;
  guessSeatIndex: number | null;
  connected: boolean;
  // Set only by an explicit "leave game" (as opposed to a plain disconnect,
  // which leaves this false so a reload/network-blip reconnect still resyncs
  // in) — findActiveSeat skips a left seat so leaving actually sticks.
  left: boolean;
};

export type RoomPhase = 'roster' | 'chat' | 'guess' | 'reveal' | 'result' | 'cancelled';
