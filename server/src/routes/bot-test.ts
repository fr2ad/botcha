import type { FastifyInstance } from 'fastify';
import { getBotReply, type ChatTurn } from '../bot/client.js';
import { pickPersona } from '../bot/personas.js';

// Debug-only endpoint to exercise the bot's real reply path (model, prompt,
// sanitize) without going through matchmaking. Not linked from the game UI.
//
// Off unless BOT_TEST=1. It takes caller-supplied text straight to a paid
// model with no auth, so anywhere it is reachable it is a free LLM proxy
// billed to whoever owns the OPENROUTER_API_KEY. The rate limit below is
// defense in depth, not the actual safeguard — that's BOT_TEST staying unset
// in production. Local only.
export function registerBotTestRoutes(app: FastifyInstance) {
  if (process.env.BOT_TEST !== '1') return;

  app.post('/api/bot-test/reply', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
    const body = req.body as { history?: ChatTurn[] };
    const history = Array.isArray(body?.history) ? body.history : [];
    const persona = pickPersona();
    const reply = await getBotReply(persona, history, 1);
    return { reply, persona: persona.id };
  });
}
