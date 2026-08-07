export type SeatKind = 'human' | 'bot';

export type Seat = {
  index: number;
  codeName: string;
  color: string;
  kind: SeatKind;
  playerId: string | null; // null for bot
  nickname: string; // real nickname (human) or fake nickname (bot)
  avatar: string;
  skippedTurns: number;
  silentBadge: boolean;
  guessSeatIndex: number | null;
  connected: boolean;
};

export type RoomPhase = 'roster' | 'chat' | 'guess' | 'reveal' | 'result' | 'cancelled';
