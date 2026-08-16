# Botcha

Multiplayer reverse-Turing-test game. Three humans and one AI bot chat
anonymously around a table in turn-based rounds; afterwards everyone privately
guesses which seat was the bot.

You are not trying to prove you are human. You are hunting the one who isn't.

Full specification, glossary, and design decisions: [`docs/SPEC.md`](docs/SPEC.md).

## Status

MVP, playable end to end: matchmaking queue, turn-based chat, Silent Player
badges, private guess phase, reveal, scoring and coin economy, daily hearts,
SQLite leaderboard and play history, prompt-injection-resistant bot personas,
client-side PNG share card, installable as a home-screen app.

**Google login is mocked** — pick a nickname and avatar and you're in. Anyone can
mint an account, so treat the leaderboard as decorative and don't run this as-is
anywhere that matters. Real OAuth, rate limiting, and a payment gateway are the
named gaps; see [`docs/SPEC.md` §10](docs/SPEC.md#10-spec-vs-built).

## Structure

```
botcha/
  server/   Fastify + WebSocket + SQLite backend (TypeScript)
  web/      React 19 + Vite frontend (TypeScript)
  docs/     Specification, glossary, decisions
```

Two packages, no shared package between them — they agree on WebSocket message
shapes by convention. The whole game loop lives in `server/src/game/room.ts`, and
`server/src/config.ts` is the single source of truth for every game and economy
number.

## Run it locally

Two terminals:

```bash
# terminal 1 — backend, http://localhost:8787
cd server && npm install && npm run dev
```

```bash
# terminal 2 — frontend, http://localhost:5173
cd web && npm install && npm run dev
```

A room needs **3 humans + 1 bot** to start. Each browser tab is tracked by a
`botcha_player_id` in `localStorage`, so separate or incognito windows work as
separate players — open three, or bring two friends.

Or skip the tabs entirely and let the smoke test play a whole game for you:

```bash
node server/scripts/smoke-test.mjs
```

It logs in three mock humans, queues them, plays three chat rounds and the guess
phase against the real bot, and asserts the game reaches a result.

**Without an `OPENROUTER_API_KEY` the bot falls back to canned replies** — it
still takes its turns and still gets guessed at, so the full loop runs with zero
external dependencies and zero cost. For real model replies, copy
`server/.env.example` to `server/.env` and set a key. Read the comments in that
file before swapping the model: the default is deliberate, and reasoning models
in particular break the bot in a way that is easy to miss.

### Checks

```bash
cd server && npm run typecheck && npx tsx src/config.test.ts
```

```bash
cd web && npm run build && npm run lint
```

There is no test framework. `server/src/config.test.ts` is a plain `node:assert`
script — follow that shape if new logic needs a check.

## How a game runs

1. Players join a global queue. Nothing is charged for waiting.
2. Three humans matched → each is charged a heart, a room spins up, one seat is
   secretly the bot.
3. Three table rounds. Each seat gets a 20-second turn to send one message, max
   200 characters. Skipping two turns earns a public Silent Player badge.
4. A 20-second private guess phase. The bot fakes a vote on a random delay so its
   status looks identical to everyone else's.
5. Reveal, then scoring: +20 and 5 coins for catching the bot, −10 for missing.

Room state is entirely in memory and a room lives two to four minutes. Only
finished games, messages, and economy reach SQLite, so a crash loses in-flight
games and nothing else.

## Deployment

Runs on a single small VPS: the Node process behind systemd, the built frontend
served as static files by nginx, and TLS terminated upstream by the provider's
HAProxy panel rather than by a proxy on the box. Nothing else — no containers, no
managed services.

The operational runbook (host, SSH access, systemd unit, nginx vhost, deploy
steps) is kept privately rather than in this repo. To deploy your own copy:

```bash
# backend: install, then run under a process manager of your choice
cd server && npm install && npm start          # serves :8787, needs server/.env

# frontend: build once, point a web server at web/dist
cd web && npm install && npm run build
```

Your web server needs to proxy `/api/` and `/ws` to the backend port, serve
`web/dist` for everything else with an SPA fallback to `index.html`, and send
`.webmanifest` as `application/manifest+json` (nginx has no built-in type for it,
and without it the install prompt is unreliable).

`server/.env` and the SQLite database are gitignored, so deploying never
overwrites your key or your data.

## Notes

- **`node:sqlite`, not `better-sqlite3`.** Node's built-in module has no native
  build step, which matters on a cheap VPS with no guaranteed compiler. It is
  still marked experimental; revisit if that becomes a problem.
- **The bot-test page** (`/#/bot-test`) exercises the real bot reply path without
  matchmaking. It is off unless `BOT_TEST=1`, because the endpoint takes
  caller-supplied text to a paid model with no auth and no rate limit — anywhere
  it is reachable, it is a free LLM proxy billed to your key.
- **Chat transcripts are never public.** Messages are stored for moderation and
  debugging only, and the share card carries no transcript.

## License

None yet — all rights reserved. Ask before reusing.
