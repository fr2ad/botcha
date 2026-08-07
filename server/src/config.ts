// All game/economy numbers in one place — matches docs/SPEC.md section 8.
export const CONFIG = {
  seatsPerRoom: 4,
  botsPerRoom: 1,
  tableRounds: 3,
  turnWindowMs: 15_000,
  maxMessageLength: 200,
  guessWindowMs: 20_000,
  dailyHearts: 5,
  signupBonusCoins: 50,
  correctGuess: { score: 20, coins: 5 },
  wrongOrNoGuess: { score: -10, coins: 0 },
  coinEntryPrice: 25,
  botReplyTimeoutMs: 10_000,
  silentBadgeAfterSkips: 2,
  minHumansToContinue: 2
} as const;

export const SEAT_CODE_NAMES: Array<{ name: string; color: string }> = [
  { name: 'Blue Fox', color: '#3d9dff' },
  { name: 'Red Owl', color: '#ff5c8a' },
  { name: 'Green Cat', color: '#38d97a' },
  { name: 'Yellow Duck', color: '#ffcf3d' }
];

export const AVATAR_POOL = ['🦝', '🐑', '🐺', '🦄', '🦉', '🐴', '🐼', '🦔', '🐨', '🐱', '🐶', '🦊'];

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
// Default matches server/.env.example — see the comment there on why this
// specific free model, and why it's worth re-checking before relying on it.
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'inclusionai/ling-3.0-tiny:free';
export const PORT = Number(process.env.PORT ?? 8787);
