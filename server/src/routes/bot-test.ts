import type { FastifyInstance } from 'fastify';
import { getBotReply, type ChatTurn } from '../bot/client.js';
import { pickPersona } from '../bot/personas.js';

// Debug-only endpoint to exercise the bot's real reply path (model, prompt,
// sanitize) without going through matchmaking. Not linked from the game UI.
export function registerBotTestRoutes(app: FastifyInstance) {
  app.post('/api/bot-test/reply', async (req) => {
    const body = req.body as { history?: ChatTurn[] };
    const history = Array.isArray(body?.history) ? body.history : [];
    const persona = pickPersona();
    const reply = await getBotReply(persona, history, 1);
    return { reply, persona: persona.id };
  });
}
