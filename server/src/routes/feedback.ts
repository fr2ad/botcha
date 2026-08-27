import type { FastifyInstance } from 'fastify';
import { recordFeedback } from '../db/index.js';

export function registerFeedbackRoutes(app: FastifyInstance) {
  app.post<{ Body: { gameId: string; playerId: string; rating: number; comment?: string } }>(
    '/api/feedback',
    async (req, reply) => {
      const { gameId, playerId, rating, comment } = req.body ?? {};
      if (!gameId || !playerId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return reply.code(400).send({ error: 'gameId, playerId and rating (1-5) are required' });
      }
      recordFeedback(gameId, playerId, rating, comment ? comment.slice(0, 500) : null);
      return { ok: true };
    }
  );
}
