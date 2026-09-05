import { CONFIG, OPENROUTER_API_KEY, OPENROUTER_MODEL } from '../config.js';
import type { Persona } from './personas.js';

export type ChatTurn = { speaker: string; text: string };

const MOCK_REPLIES = [
  'ngl not sure whats going on here',
  "wait can someone repeat the last question",
  'lol ok',
  "i'm just vibing tbh",
  'this is harder than i thought',
  'no comment 👀',
  'same tbh',
  'idk man',
  "ok that's suspicious energy from someone"
];

// Strips anything that reads like a meta/AI admission, in case the model
// slips despite the persona prompt. Belt-and-suspenders, not a guarantee.
const LEAK_PATTERNS = [
  /as an ai\b/i,
  /language model/i,
  /i (?:am|'m) an? (?:ai|bot|assistant|llm)/i,
  /i do not have (?:feelings|a body|personal experiences)/i,
  /openai|anthropic|claude|gpt-\d|llama/i
];

// Some models (verified: gemini-2.5-flash-lite) echo the out-of-band turn
// instruction straight into the reply instead of just following it — a
// literal "Send your next chat message now, under 200 chars..." in chat is
// as loud a tell as an AI admission. Cut everything from the first point a
// long recognizable chunk of the instruction shows up verbatim.
// ponytail: prefix-only match, misses a leak that starts mid-instruction —
// widen to a sliding window if that shows up in practice.
function stripInstructionLeak(text: string, instruction: string): string {
  const MIN_LEAK_MATCH = 30;
  for (let len = instruction.length; len >= MIN_LEAK_MATCH; len--) {
    const idx = text.indexOf(instruction.slice(0, len));
    if (idx !== -1) return text.slice(0, idx).trim();
  }
  return text;
}

function sanitize(text: string, speakers: string[] = [], instruction = ''): string {
  let out = instruction ? stripInstructionLeak(text.trim(), instruction) : text.trim();
  for (const re of LEAK_PATTERNS) {
    if (re.test(out)) return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
  }

  // History is fed in as "Blue Fox: hi", and models imitate that format —
  // gpt-4o-mini prefixed 44% of replies with another seat's name in testing,
  // which renders as that seat talking under the bot's own header. Only strip
  // a prefix that actually names a speaker in this game.
  for (const name of speakers) {
    const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
    if (re.test(out)) {
      out = out.replace(re, '');
      break;
    }
  }

  // One turn is one chat message; newlines would render as a multi-line
  // monologue no human types into a turn-based box.
  out = out.replace(/\s*\n+\s*/g, ' ').trim();

  if (out.length > CONFIG.maxMessageLength) out = out.slice(0, CONFIG.maxMessageLength - 1) + '…';
  // Empty content (model returned nothing, e.g. reasoning ate the whole
  // budget) used to fall back to a hardcoded 'lol' — that's why the bot
  // seemed to always say it. Pick a varied mock line instead.
  return out || MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
}

// Rotates what the bot is nudged to actually do this turn — a model left to
// "react naturally" every turn converges on safe generic agreement, which is
// its own tell (real players trash talk, needle each other, go off topic).
// Weighted toward plain reaction so it's still the common case.
const TURN_MOVES = [
  'React to something specific someone actually said — don\'t just say "lol" or another one-word filler.',
  'React to something specific someone actually said — don\'t just say "lol" or another one-word filler.',
  "Ask the table something simple and offhand — where's someone from, what language do they usually talk, stuff like that.",
  'Playfully accuse a specific person of being the bot, @mentioning them.',
  'Trash talk someone a little, @mentioning them, calling back to something they actually said.',
  '@Mention someone by name and reply to them directly.'
];

function pickTurnMove(): string {
  return TURN_MOVES[Math.floor(Math.random() * TURN_MOVES.length)];
}

export async function getBotReply(
  persona: Persona,
  history: ChatTurn[],
  round: number,
  ownCodeName?: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    // No key configured — deterministic-ish mock so local dev works end to end.
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 1200));
    return sanitize(MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]);
  }

  // "React to something specific someone said" is nonsensical on the very
  // first turn (empty history) — telling the model to do it anyway made it
  // spiral trying to resolve the contradiction, sometimes burning 600+
  // hidden reasoning tokens and returning nothing at all.
  const instruction =
    history.length === 0
      ? `(Round ${round}/${CONFIG.tableRounds}. You're speaking first, nobody has said anything yet. Open with something plain and casual, under ${CONFIG.maxMessageLength} chars — the kind of throwaway line a real player types first. No jokes about people who haven't spoken.)`
      : // Humans in this game chat in whatever language they like (Persian is
        // common) — replying in English to an all-Persian table, or narrating
        // other players in the third person, are both instant tells. So is a
        // tidy, well-formed paragraph — real chat is one short fragment, not
        // three clauses stitched together. pickTurnMove rotates the specific
        // move (question, accusation, trash talk...) so it's not the same
        // "react and move on" every single turn.
        `(Round ${round}/${CONFIG.tableRounds}. Send your next chat message now, under ${CONFIG.maxMessageLength} chars. Write in the SAME language and script the others are using, matching their tone and register — if they write Persian, write Persian. Talk TO people, not about them in the third person. One short sentence or fragment — no multi-clause run-ons, that reads as an essay, not a text. If you name another player, always write their exact code name with an @ right before it (e.g. @CrimsonOwl) — never say their name bare with no @, and if you're not going to @mention them, don't name them at all. ${pickTurnMove()})`;

  // The bot's own past turns go back as `assistant`, not as another
  // "Name: text" user line. Feeding them as user messages made it treat its
  // own words as someone else's and parrot them verbatim the next turn — and
  // encouraged it to write whole lines *for* other seats, both dead tells.
  const messages = [
    { role: 'system', content: persona.systemPrompt },
    ...history.map((h) =>
      ownCodeName && h.speaker === ownCodeName
        ? { role: 'assistant' as const, content: h.text }
        : { role: 'user' as const, content: `${h.speaker}: ${h.text}` }
    ),
    { role: 'user', content: instruction }
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.botReplyTimeoutMs);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        // This model is a reasoner and the free-tier route ignores
        // reasoning.max_tokens (verified: burns 150-350+ tokens on hidden
        // "reasoning" regardless of the cap). A tight max_tokens starves the
        // actual reply -> content comes back null -> sanitize's mock
        // fallback, which looked like the bot never using AI at all. Give
        // it real headroom instead of trying to cap reasoning.
        max_tokens: 500,
        reasoning: { max_tokens: 40 },
        temperature: 1,
        frequency_penalty: 0.7,
        presence_penalty: 0.5
      }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`openrouter ${res.status} ${await res.text().catch(() => '')}`);
    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content ?? '';
    if (!text) console.error('[bot] empty content', JSON.stringify(json?.choices?.[0]));
    return sanitize(text, [...new Set(history.map((h) => h.speaker))], instruction);
  } catch (err) {
    // Timeout, network error, or non-2xx — the bot just skips this turn,
    // indistinguishable from a hesitant human (see SPEC 3.5). Logged so a
    // silent skip is diagnosable after the fact instead of a total mystery.
    console.error('[bot] reply failed', err);
    return '';
  } finally {
    clearTimeout(timeout);
  }
}
