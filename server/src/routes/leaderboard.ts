import type { FastifyInstance } from 'fastify';
import { getLeaderboard } from '../db/index.js';

export function registerLeaderboardRoutes(app: FastifyInstance) {
  app.get('/api/leaderboard', async () => {
    return { players: getLeaderboard(50) };
  });
}
