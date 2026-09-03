# Botcha

Multiplayer reverse-Turing-test game. Four seats chat anonymously around a
table in turn-based rounds — 1 to 3 of them are AI bots, and you're never told
how many; afterwards everyone privately guesses which seats were bots.

You are not trying to prove you are human. You are hunting the ones who aren't.

Full specification, glossary, and design decisions: [`docs/SPEC.md`](docs/SPEC.md).

## Status

MVP, playable end to end: matchmaking queue (bot-fills a table in 12s, so it's
playable solo), turn-based chat, Silent Player badges, private guess phase,
reveal, scoring and coin economy, daily hearts, SQLite leaderboard and play
history, prompt-injection-resistant bot personas, client-side PNG share card,
installable as a home-screen app.

**Google Sign-In is real** (ID-token verified server-side) once
`GOOGLE_CLIENT_ID` is configured; a mock nickname/avatar login stays available
alongside it for local dev and the smoke test — see
[`docs/SPEC.md` §12](docs/SPEC.md#12-open-assumptions). HTTP routes are
rate-limited per IP, tighter still on signup. A payment gateway is the
remaining named gap; see [`docs/SPEC.md` §10](docs/SPEC.md#10-spec-vs-built).

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

A room seats 4: as many real players as are waiting (up to 3), bots filling
whatever's left after a 12-second wait — so one tab alone still gets a full
game. Each browser tab is tracked by a `botcha_player_id` in `localStorage`,
so separate or incognito windows work as separate players if you want to play
with real seatmates instead.

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
2. A room seats 4 — as many real players as are waiting fill first, bots take
   whatever's left after a 12-second wait, so 1 to 3 seats end up secretly
   bots. Everyone seated is charged a heart, a room spins up.
3. Three table rounds. Each seat gets a 30-second turn to send one message,
   max 200 characters. Skipping two turns earns a public Silent Player badge.
4. A 20-second private guess phase. Each bot fakes a vote on its own random
   delay so its status looks identical to everyone else's.
5. Reveal, then scoring: +20 and 5 coins for catching a bot, −10 for missing.

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
  caller-supplied text to a paid model with no auth — anywhere it is reachable,
  it is a free LLM proxy billed to your key. A tight per-route rate limit is
  defense in depth; `BOT_TEST` staying unset in production is the real guard.
- **The share card carries the real transcript.** It renders your table's
  actual chat, client-side, as a deliberate product call — a bare score isn't
  shareable, a puzzle other people can read and guess at is. It does mean
  other players' messages can end up in an image posted anywhere; Terms of
  Service covers this and a line sits next to the in-app Share button.
- **HTTP is rate-limited per IP** (`@fastify/rate-limit`), tighter still on the
  two account-creation routes. WebSocket frames aren't — see
  [`docs/SPEC.md` §8](docs/SPEC.md#8-architecture) for the remaining gap.

## License

None yet — all rights reserved. Ask before reusing.
