// All game/economy numbers in one place — matches docs/SPEC.md section 8.
export const CONFIG = {
  seatsPerRoom: 4,
  // Bot count is now variable, not fixed — see queue.ts. A room always seats
  // between 1 and seatsPerRoom-1 Bots, never 0 (the game needs a bot to hunt)
  // and never a table of only Bots (a lone Player still needs a table).
  tableRounds: 3,
  // How long a queued Player waits for enough real opponents before the rest
  // of the table fills with Bots. Keeps the queue from ever truly blocking —
  // worst case, a Player alone gets a full 3-Bot table after this wait.
  queueFillTimeoutMs: 12_000,
  turnWindowMs: 30_000,
  maxMessageLength: 200,
  guessWindowMs: 20_000,
  maxHearts: 5,
  // Candy Crush's exact cadence: one Heart back every 30 min, capped at
  // maxHearts — a rolling per-Heart timer instead of a full reset at a fixed
  // clock time, so how long you wait depends only on when you ran out, never
  // on the wall-clock hour you happened to run out at.
  heartRegenMs: 30 * 60_000,
  signupBonusCoins: 50,
  // Paid on top of signupBonusCoins the first time a new player's signup
  // carries a valid, non-self invite code — split so both sides feel it.
  inviteRewardCoins: { inviter: 30, invitee: 20 },
  correctGuess: { score: 20, coins: 5 },
  wrongOrNoGuess: { score: -10, coins: 0 },
  coinEntryPrice: 25,
  botReplyTimeoutMs: 10_000,
  // The bot answered the instant the model returned — a ~1s Turn every time,
  // which is the loudest tell at the table. Fake reading/thinking time, then
  // per-character typing time (~40ms/char ≈ 60wpm on a phone).
  botThinkMinMs: 1_500,
  botThinkMaxMs: 4_500,
  botTypingMsPerChar: 40,
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

// How long the bot still has to "wait" before its reply lands. Generation time
// already spent counts toward it, so a slow model doesn't stack delay on delay.
// Always leaves a 500ms margin before the Turn deadline, or a long reply near
// the char cap would blow the window and the Turn would read as skipped.
export function botDelayMs(text: string, elapsedMs: number, deadline: number, now = Date.now()) {
  const think = CONFIG.botThinkMinMs + Math.random() * (CONFIG.botThinkMaxMs - CONFIG.botThinkMinMs);
  const human = think + text.length * CONFIG.botTypingMsPerChar;
  return Math.max(0, Math.min(human - elapsedMs, deadline - now - 500));
}

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
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite';
export const PORT = Number(process.env.PORT ?? 8787);

// Real Google Sign-In (ID token verification, see routes/auth.ts). Unset ->
// /api/auth/mock-login stays the only login path, exactly like today.
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';

// firebase-admin, for the hearts-refill push (scheduler.ts). The full
// service account JSON, as a single-line env var. Unset -> pushes are
// skipped; hearts still refill, players just aren't notified.
export const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '';
