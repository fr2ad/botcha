import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { AVATAR_POOL } from '../config.js';
import { createPlayer, getPlayer, getPlayerHistory, getPlayerRank, setAvatar } from '../db/index.js';

// Mock Google login: no real OAuth. The client sends a nickname + avatar it
// picked and either gets a fresh player or (if it already has a playerId
// from localStorage) fetches the existing one. Swap this route for real
// Google OAuth in Phase 2 without touching anything downstream — every other
// route only ever deals with an opaque playerId.
export function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: { nickname: string; avatar: string } }>('/api/auth/mock-login', async (req, reply) => {
    const { nickname, avatar } = req.body ?? {};
    if (!nickname || !avatar) {
      return reply.code(400).send({ error: 'nickname and avatar are required' });
    }
    // The avatar id is echoed to every other player in the room, so it has to
    // be one we actually draw — not whatever string the client felt like.
    if (!AVATAR_POOL.includes(avatar)) {
      return reply.code(400).send({ error: 'unknown avatar' });
    }
    const id = nanoid(12);
    const player = createPlayer({ id, googleId: `mock-${id}`, nickname: nickname.slice(0, 24), avatar });
    return { player: withStats(player.id) };
  });

  app.get<{ Params: { id: string } }>('/api/players/:id', async (req, reply) => {
    const player = getPlayer(req.params.id);
    if (!player) return reply.code(404).send({ error: 'not found' });
    return { player: withStats(player.id) };
  });

  // Same trust model as the rest of the mock-login MVP: the playerId in the
  // path is the credential. Real Google OAuth (SPEC 9) is what makes this a
  // real authorization check; until then anyone holding an id can edit it.
  app.patch<{ Params: { id: string }; Body: { avatar?: string } }>(
    '/api/players/:id',
    async (req, reply) => {
      const player = getPlayer(req.params.id);
      if (!player) return reply.code(404).send({ error: 'not found' });

      const { avatar } = req.body ?? {};
      if (!avatar || !AVATAR_POOL.includes(avatar)) {
        return reply.code(400).send({ error: 'unknown avatar' });
      }

      setAvatar(player.id, avatar);
      return { player: withStats(player.id) };
    }
  );
}

function withStats(playerId: string) {
  const player = getPlayer(playerId)!;
  return {
    ...player,
    rank: getPlayerRank(playerId),
    history: getPlayerHistory(playerId)
  };
}
