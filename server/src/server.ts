import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { PORT } from './config.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLeaderboardRoutes } from './routes/leaderboard.js';
import { registerWsRoute } from './routes/ws.js';
import { registerBotTestRoutes } from './routes/bot-test.js';
import { registerFeedbackRoutes } from './routes/feedback.js';
import { startScheduler } from './scheduler.js';
import './db/index.js'; // ensure schema is created on boot

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

registerAuthRoutes(app);
registerLeaderboardRoutes(app);
registerWsRoute(app);
registerBotTestRoutes(app);
registerFeedbackRoutes(app);

app.get('/api/health', async () => ({ ok: true }));

startScheduler();

app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
