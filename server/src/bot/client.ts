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

function sanitize(text: string, speakers: string[] = []): string {
  let out = text.trim();
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
      ? `(Round ${round}/${CONFIG.tableRounds}. You're speaking first. Send an opening chat message now, under ${CONFIG.maxMessageLength} chars — something a real player might say to kick things off, not a generic greeting.)`
      : `(Round ${round}/${CONFIG.tableRounds}. Send your next chat message now, under ${CONFIG.maxMessageLength} chars. React to something specific someone actually said — don't just say "lol" or another one-word filler.)`;

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
    return sanitize(text, [...new Set(history.map((h) => h.speaker))]);
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
