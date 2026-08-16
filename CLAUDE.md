# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Botcha: multiplayer reverse-Turing-test web game. 3 humans + 1 AI Bot chat anonymously in turn-based rounds, then privately guess which Seat is the Bot. Full product spec, glossary, and ADRs live one level up: `../docs/SPEC.md`, `../CONTEXT.md`, `../docs/adr/`. Read `../CONTEXT.md` before touching game-loop code — it fixes exact terms (Seat, Turn, Table Round, Guess, Silent Player, Heart) and the ones to avoid (slot, vote, AFK, lobby); the codebase uses this vocabulary literally in type names and event names.

## Commands

```bash
# backend — server/, http://localhost:8787
cd server && npm install && npm run dev     # tsx watch
npm run typecheck                            # tsc --noEmit
npx tsx src/config.test.ts                   # the only test: assert-based self-check on seat identities

# frontend — web/, http://localhost:5173
cd web && npm install && npm run dev         # vite
npm run build                                # tsc -b && vite build
npm run lint                                 # oxlint
```

No `OPENROUTER_API_KEY` set → bot auto-falls-back to mock replies (`server/src/bot/client.ts`), so the full loop runs with zero external deps. To use a real model, copy `server/.env.example` to `server/.env`.

There is no test framework in either package. `server/src/config.test.ts` is a bare `node:assert` script run directly with tsx — follow that pattern (one runnable file, no framework, no fixtures) if new logic needs a check.

Verify real changes by running both dev servers and playing through the loop (needs 3 human tabs; each browser tab is tracked via `botcha_player_id` in localStorage, so separate/incognito tabs simulate separate players). `.claude/launch.json` defines both servers as `web` and `server` for the preview tooling.

## Architecture

Single VPS, single Node process philosophy — no microservices. Two packages, both TypeScript, no shared package:

- `server/` — Fastify + `@fastify/websocket` + `node:sqlite` (built-in, not `better-sqlite3` — chosen to avoid a native build step; see comment in `server/src/db/index.ts`)
- `web/` — React 19 + Vite + react-router (`HashRouter`, routes are `/#/...`)

### Server-side game flow

1. `routes/ws.ts` — single `/ws` route, keyed by `playerId` query param (from mock login, no real auth). Dispatches `queue.join`/`queue.leave`/`turn.message`/`guess.submit` frames.
2. `game/queue.ts` — in-memory array queue. When enough humans queue (`seatsPerRoom - botsPerRoom`), it charges each a Heart/Coin (`db/index.ts: spendHeartOrCoin`) and spins up a `Room`.
3. `game/room.ts` — the whole game loop lives in `Room.run()`: 3-second roster pause → `tableRounds` × turn-order loop (`runTurn`, one human message or one bot reply per Seat, 200-char cap, timeout skips the Turn) → 2.5s grace pause → `runGuessPhase` (20s window, bot "votes" via a randomized fake delay) → `runReveal` (scores everyone, persists to SQLite, resets each player's `conn.gameId`).
4. Room state is **entirely in-memory** (`Room` instances live in `activeRooms` map, ~2-4 min lifetime). Only `recordGameStart`/`recordSeat`/`recordMessage`/`finalizeSeat`/`recordGameEnd` touch SQLite, so a crash only loses in-flight games, never history/economy.
5. `game/connections.ts` holds the single `playerId -> {ws, gameId, pendingTurnResolve, pendingGuessResolve}` map that both the WS route and `Room` read/write — this is how a `turn.message` WS frame becomes the awaited value in `Room.runTurn`'s promise (`waitForTurnMessage`/`waitForGuess` register a resolver on the connection, the WS handler calls it).
6. `bot/client.ts` calls OpenRouter directly (no SDK). `sanitize()` strips AI-admission patterns as a second line of defense after the persona system prompt (`bot/personas.ts`) — prompt-injection resistance is a stated hard requirement (SPEC §5), not incidental.
7. `server/src/config.ts` is the single source of truth for every game/economy number (turn length, round count, scoring, prices) and must stay in sync with `docs/SPEC.md` §8 — change numbers here, not scattered through room.ts.
8. `/bot-test` route (`routes/bot-test.ts` + `web/src/screens/BotTest.tsx`) is a debug-only page to iterate on bot replies without spinning up a full 3-human room.

### Client-side state flow

`web/src/GameContext.tsx` is the single source of truth: one `useReducer` whose action types are **the literal WebSocket message types** the server sends (`turn.begin`, `turn.message`, `guess.begin`, `reveal`, `game.result`, etc. — `ws.onmessage` dispatches the parsed frame directly, no translation layer). Screens under `web/src/screens/` are effectively one-per-`GamePhase`, driven by `state.phase`; routing in `App.tsx` just guards each route on `loggedIn` and otherwise trusts `GameContext` to reflect phase via component logic, not route params. Reconnect-on-close is automatic (1.5s retry) unless the socket was closed intentionally.

### UI / styling

[DESIGN.md](DESIGN.md) is the source of truth for look, motion, and screen anatomy — read it before touching `web/src/index.css` or anything under `web/src/screens/`. Every color, radius, shadow, and easing is a `:root` token in `index.css`; use the variable, never the literal. Seat colors are rings and accents only, never fills.

When adding a new server→client event: add the WS message shape server-side, add a case to the reducer in `GameContext.tsx` matching that `type` string, and consume the new state in the relevant screen — there is no intermediate DTO/mapping step.

## Data model

SQLite tables (`server/src/db/index.ts`, created via `IF NOT EXISTS` on boot, no migration framework): `players`, `games`, `game_seats`, `coin_ledger` (append-only, source of truth for Coins), `messages`, `play_history`. Google OAuth is mocked (`routes/auth.ts`: `/api/auth/mock-login` just creates a player from a client-picked nickname/avatar) — every downstream route only ever deals with an opaque `playerId`, so swapping in real OAuth later shouldn't touch game logic.

## Deployment

Live at `botcha.far2ad.space` on a single VPS behind the provider's HAProxy panel (not a normal reverse proxy — see README for why). Full deploy/update/verify runbook is in [README.md](README.md) — read it before touching prod; the short version is push to `main`, fast-forward pull on the box, reinstall+restart only the half that changed (server via systemd unit `botcha`, web via rebuild + nginx static).
