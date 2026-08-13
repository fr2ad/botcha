// All game/economy numbers in one place — matches docs/SPEC.md section 8.
export const CONFIG = {
  seatsPerRoom: 4,
  botsPerRoom: 1,
  tableRounds: 3,
  turnWindowMs: 20_000,
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

// Seat code names: 10 color families x 5 animals = 50 unique names. A Seat is
// "a color plus code name" (CONTEXT.md), so the color word has to match what
// the player actually sees — the hue below is the color the name promises.
// Every animal is unique across the whole pool, so no two seats in a game can
// share either half of their name.
const SEAT_FAMILIES: Array<{ color: string; hue: number; animals: string[] }> = [
  { color: 'Crimson', hue: 25, animals: ['Owl', 'Viper', 'Stag', 'Wasp', 'Puma'] },
  { color: 'Ember', hue: 55, animals: ['Lynx', 'Dingo', 'Marten', 'Falcon', 'Ocelot'] },
  { color: 'Amber', hue: 90, animals: ['Duck', 'Weasel', 'Mongoose', 'Cricket', 'Hyena'] },
  { color: 'Lime', hue: 125, animals: ['Mantis', 'Gecko', 'Beetle', 'Newt', 'Cicada'] },
  { color: 'Jade', hue: 155, animals: ['Cat', 'Turtle', 'Iguana', 'Moth', 'Frog'] },
  { color: 'Teal', hue: 190, animals: ['Otter', 'Orca', 'Urchin', 'Pelican', 'Heron'] },
  { color: 'Azure', hue: 225, animals: ['Hawk', 'Kestrel', 'Swift', 'Ibis', 'Egret'] },
  { color: 'Blue', hue: 260, animals: ['Fox', 'Wolf', 'Jackal', 'Coyote', 'Husky'] },
  { color: 'Violet', hue: 300, animals: ['Raven', 'Crow', 'Panther', 'Bat', 'Loris'] },
  { color: 'Rose', hue: 350, animals: ['Flamingo', 'Quail', 'Sparrow', 'Pika', 'Tapir'] }
];

export type SeatIdentity = { name: string; color: string };

// The full 50. Exported for tooling/tests; games use pickSeatIdentities.
export const SEAT_CODE_NAMES: SeatIdentity[] = SEAT_FAMILIES.flatMap((f) =>
  f.animals.map((animal) => ({ name: `${f.color} ${animal}`, color: seatColor(f.hue) }))
);

function seatColor(hue: number) {
  return `oklch(70% 0.16 ${hue})`;
}

// Picks from distinct color families rather than straight off the 50, so four
// seats are never near-identical hues — telling seats apart at a glance is the
// whole game, and "Crimson Owl vs Rose Quail" in the same room would not be.
export function pickSeatIdentities(count: number): SeatIdentity[] {
  const families = [...SEAT_FAMILIES];
  for (let i = families.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [families[i], families[j]] = [families[j], families[i]];
  }
  return families.slice(0, count).map((f) => ({
    name: `${f.color} ${f.animals[Math.floor(Math.random() * f.animals.length)]}`,
    color: seatColor(f.hue)
  }));
}

// Avatar ids, not emoji — the client draws each one (web/src/components/Orb.tsx).
// Keep this list and the client's in sync; they are the same 15 faces.
export const AVATAR_POOL = [
  'dot',
  'diamond',
  'bar',
  'square',
  'cyclops',
  'brow',
  'capsule',
  'trio',
  'visor',
  'wedge',
  'scan',
  'cross',
  'sleepy',
  'pip',
  'crown'
];

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
// Default matches server/.env.example — see the comment there on why this
// specific free model, and why it's worth re-checking before relying on it.
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'qwen/qwen3-30b-a3b-instruct-2507';
export const PORT = Number(process.env.PORT ?? 8787);
