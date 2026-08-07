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

function sanitize(text: string): string {
  let out = text.trim();
  for (const re of LEAK_PATTERNS) {
    if (re.test(out)) return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
  }
  if (out.length > CONFIG.maxMessageLength) out = out.slice(0, CONFIG.maxMessageLength - 1) + '…';
  return out || 'lol';
}

export async function getBotReply(persona: Persona, history: ChatTurn[], round: number): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    // No key configured — deterministic-ish mock so local dev works end to end.
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 1200));
    return sanitize(MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]);
  }

  const messages = [
    { role: 'system', content: persona.systemPrompt },
    ...history.map((h) => ({ role: 'user' as const, content: `${h.speaker}: ${h.text}` })),
    { role: 'user', content: `(Round ${round}/${CONFIG.tableRounds}. Send your next chat message now, under ${CONFIG.maxMessageLength} chars.)` }
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
        max_tokens: 80,
        temperature: 0.9
      }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`openrouter ${res.status}`);
    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content ?? '';
    return sanitize(text);
  } catch {
    // Timeout, network error, or non-2xx — the bot just skips this turn,
    // indistinguishable from a hesitant human (see SPEC 3.5).
    return '';
  } finally {
    clearTimeout(timeout);
  }
}
