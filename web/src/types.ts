export type Player = {
  id: string;
  nickname: string;
  avatar: string;
  coins: number;
  score: number;
  hearts_remaining: number;
  rank: number;
  history: { correct: number; wrong: number; noGuess: number; games: number };
};

export type RosterEntry = {
  seatIndex: number;
  codeName: string;
  color: string;
  nickname: string;
  avatar: string;
};

export type ChatMessage = {
  seatIndex: number;
  round: number;
  text: string;
};

export type RevealData = {
  botSeatIndex: number;
  guesses: Array<{ seatIndex: number; guessSeatIndex: number | null }>;
  identities: Array<{ seatIndex: number; nickname: string; avatar: string; isBot: boolean }>;
};

export type ResultData = {
  outcome: 'correct' | 'wrong' | 'no_guess';
  scoreDelta: number;
  coinDelta: number;
  leaderboardRank: number;
  botSeatIndex: number;
  yourSeatIndex: number;
};

export type GamePhase =
  | 'idle'
  | 'queue'
  | 'roster'
  | 'chat'
  | 'guess'
  | 'reveal'
  | 'result'
  | 'cancelled';

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  coins: number;
};
