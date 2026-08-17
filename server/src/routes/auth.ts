import type { FastifyInstance } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { nanoid } from 'nanoid';
import { AVATAR_POOL, GOOGLE_CLIENT_ID } from '../config.js';
import {
  createPlayer,
  getPlayer,
  getPlayerByGoogleId,
  getPlayerHistory,
  getPlayerRank,
  setAvatar,
  setFcmToken
} from '../db/index.js';

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export function registerAuthRoutes(app: FastifyInstance) {
  // Dev/mock login: no real OAuth, the client sends a nickname + avatar it
  // picked. Left in place even once Google login is configured — useful for
  // local dev without a Google Cloud project, and for the smoke test.
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

  // Real Google Sign-In. The client gets an ID token from Google Identity
  // Services (no client secret involved — GIS's token-based flow only needs
  // the public Client ID, verified here against Google's own signing keys).
  // A returning Player (google_id already on file) logs straight in; a new
  // one gets `newGoogleUser` back so the client can run them through the
  // existing Nickname/Avatar picker before calling google-signup below —
  // the Google identity is not the in-game identity (SPEC §3).
  app.post<{ Body: { idToken: string } }>('/api/auth/google-login', async (req, reply) => {
    if (!googleClient) return reply.code(503).send({ error: 'google login not configured' });
    const { idToken } = req.body ?? {};
    if (!idToken) return reply.code(400).send({ error: 'idToken is required' });

    let googleId: string;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new Error('no sub claim');
      googleId = payload.sub;
    } catch {
      return reply.code(401).send({ error: 'invalid google token' });
    }

    const existing = getPlayerByGoogleId(googleId);
    if (existing) return { player: withStats(existing.id) };
    return { newGoogleUser: true, googleId };
  });

  // Finishes signup for a `newGoogleUser` from above: same shape as
  // mock-login, but keyed to the verified googleId instead of a fake one.
  app.post<{ Body: { googleId: string; nickname: string; avatar: string } }>(
    '/api/auth/google-signup',
    async (req, reply) => {
      const { googleId, nickname, avatar } = req.body ?? {};
      if (!googleId || !nickname || !avatar) {
        return reply.code(400).send({ error: 'googleId, nickname and avatar are required' });
      }
      if (!AVATAR_POOL.includes(avatar)) {
        return reply.code(400).send({ error: 'unknown avatar' });
      }
      if (getPlayerByGoogleId(googleId)) {
        return reply.code(409).send({ error: 'already signed up' });
      }
      const id = nanoid(12);
      const player = createPlayer({ id, googleId, nickname: nickname.slice(0, 24), avatar });
      return { player: withStats(player.id) };
    }
  );

  // FCM token for push notifications (hearts refill — scheduler.ts). Same
  // trust model as the rest of this MVP: the playerId in the path is the
  // credential.
  app.post<{ Params: { id: string }; Body: { token: string } }>(
    '/api/players/:id/fcm-token',
    async (req, reply) => {
      const player = getPlayer(req.params.id);
      if (!player) return reply.code(404).send({ error: 'not found' });
      const { token } = req.body ?? {};
      if (!token) return reply.code(400).send({ error: 'token is required' });
      setFcmToken(player.id, token);
      return { ok: true };
    }
  );

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
