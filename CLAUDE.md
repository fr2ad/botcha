# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Botcha: multiplayer reverse-Turing-test web game. 4 Seats chat anonymously in turn-based rounds — 1 to 3 are AI Bots, never disclosed how many — then everyone privately guesses which Seats are Bots. Spec, glossary, and decisions are one merged document: [docs/SPEC.md](docs/SPEC.md). Read its §2 vocabulary before touching game-loop code — it fixes exact terms (Seat, Turn, Table Round, Guess, Silent Player, Heart) and the ones to avoid (slot, vote, AFK, lobby); the codebase uses this vocabulary literally in type names and event names. §10 lists where the shipped code deliberately diverges from the spec.

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

`node server/scripts/smoke-test.mjs` drives a whole game headlessly — 3 mock humans through queue, 3 chat rounds, guess phase, result. Reach for it before hand-driving browser tabs; it needs only the backend running.

For UI changes, verify by running both dev servers and playing the loop (needs 3 human tabs; each browser tab is tracked via `botcha_player_id` in localStorage, so separate/incognito tabs simulate separate players). Pair a single browser tab with the smoke test's players to reach `/table` without opening three windows. `.claude/launch.json` defines both servers as `web` and `server` for the preview tooling.

`/api/bot-test/reply` and the `/#/bot-test` page only exist when `BOT_TEST=1` — the endpoint is an unauthenticated path to a paid model (a per-route rate limit is defense in depth, not the real safeguard), so it must never be enabled on a reachable host.

## Architecture

Single VPS, single Node process philosophy — no microservices. Two packages, both TypeScript, no shared package:

- `server/` — Fastify + `@fastify/websocket` + `node:sqlite` (built-in, not `better-sqlite3` — chosen to avoid a native build step; see comment in `server/src/db/index.ts`)
- `web/` — React 19 + Vite + react-router (`HashRouter`, routes are `/#/...`)

### Server-side game flow

1. `routes/ws.ts` — single `/ws` route, keyed by `playerId` query param (see Data model below for how that id was minted). Dispatches `queue.join`/`queue.leave`/`turn.message`/`guess.submit` frames. HTTP routes go through `@fastify/rate-limit`, registered globally in `server.ts`; this WS route does not, so `turn.message`/`queue.join` frames are still unthrottled (`docs/SPEC.md` §8 tracks this as an open gap).
2. `game/queue.ts` — in-memory array queue. As many real humans seat as are waiting, up to `seatsPerRoom - 1`; whatever's left is bot-filled once `CONFIG.queueFillTimeoutMs` (12s) elapses for whoever's waited longest, so a solo player still gets a full game. Each seated human is charged a Heart/Coin (`db/index.ts: spendHeartOrCoin`) and a `Room` spins up.
3. `game/room.ts` — the whole game loop lives in `Room.run()`: 3-second roster pause → `tableRounds` × turn-order loop (`runTurn`, one human message or one bot reply per Seat, 200-char cap, timeout skips the Turn) → 2.5s grace pause → `runGuessPhase` (20s window, bot "votes" via a randomized fake delay) → `runReveal` (scores everyone, persists to SQLite, resets each player's `conn.gameId`).
4. Room state is **entirely in-memory** (`Room` instances live in `activeRooms` map, ~2-4 min lifetime). Only `recordGameStart`/`recordSeat`/`recordMessage`/`finalizeSeat`/`recordGameEnd` touch SQLite, so a crash only loses in-flight games, never history/economy.
5. `game/connections.ts` holds the single `playerId -> {ws, gameId, pendingTurnResolve, pendingGuessResolve}` map that both the WS route and `Room` read/write — this is how a `turn.message` WS frame becomes the awaited value in `Room.runTurn`'s promise (`waitForTurnMessage`/`waitForGuess` register a resolver on the connection, the WS handler calls it).
6. `bot/client.ts` calls OpenRouter directly (no SDK). `sanitize()` strips AI-admission patterns as a second line of defense after the persona system prompt (`bot/personas.ts`) — prompt-injection resistance is a stated hard requirement ([docs/SPEC.md §7](docs/SPEC.md)), not incidental.
7. `server/src/config.ts` is the single source of truth for every game/economy number (turn length, round count, scoring, prices) and must stay in sync with [docs/SPEC.md §8.3](docs/SPEC.md) — change numbers here, not scattered through room.ts.
8. `/bot-test` route (`routes/bot-test.ts` + `web/src/screens/BotTest.tsx`) is a debug-only page to iterate on bot replies without spinning up a full room. Registered only when `BOT_TEST=1`, with its own tight rate-limit override on top of that — the real safeguard is `BOT_TEST` staying unset on any reachable host, not the limit.
9. Every WS connect calls `queue.ts: findActiveSeat(playerId)` before touching `conn.gameId` — a player still seated in a live room (`phase` not `result`/`cancelled`) gets `conn.gameId` restored and a `game.resync` snapshot (`Room.snapshotFor`) instead of the reset-to-null that used to silently orphan a reconnecting mid-game player; otherwise the client gets an explicit `game.none`. Client-side this drives `GameContext`'s `'failed'` phase (`web/src/screens/SessionEnded.tsx`) when a game the client expected is actually gone.

### Client-side state flow

`web/src/GameContext.tsx` is the single source of truth: one `useReducer` whose action types are **the literal WebSocket message types** the server sends (`turn.begin`, `turn.message`, `guess.begin`, `reveal`, `game.result`, etc. — `ws.onmessage` dispatches the parsed frame directly, no translation layer). Screens under `web/src/screens/` are effectively one-per-`GamePhase`, driven by `state.phase`; routing in `App.tsx` just guards each route on `loggedIn` and otherwise trusts `GameContext` to reflect phase via component logic, not route params. Reconnect-on-close is automatic (1.5s retry) unless the socket was closed intentionally.

### UI / styling

[DESIGN.md](DESIGN.md) is the source of truth for look, motion, and screen anatomy — read it before touching `web/src/index.css` or anything under `web/src/screens/`. Every color, radius, shadow, and easing is a `:root` token in `index.css`; use the variable, never the literal. Seat colors are rings and accents only, never fills.

When adding a new server→client event: add the WS message shape server-side, add a case to the reducer in `GameContext.tsx` matching that `type` string, and consume the new state in the relevant screen — there is no intermediate DTO/mapping step.

The tagline ("1-3 bots at the table. Find them.") is repeated verbatim in `web/index.html`'s `<title>`/OG/Twitter tags, `web/public/manifest.webmanifest`, `Landing.tsx`, and `README.md` — change it in all four together, or link previews and the installed-app name will disagree with the page itself. `web/public/og-image.png` is a static, hand-built 1200×630 share-preview image, not generated from live game state; if the tagline or brand colors change, rebuild it from an HTML mockup screenshotted at that exact size (a headless browser via Playwright/Puppeteer is the quickest path — the repo has neither installed, so bring your own).

## Data model

SQLite tables (`server/src/db/index.ts`, created via `IF NOT EXISTS` on boot, no migration framework): `players` (now also `fcm_token` for push, and `invite_code`/`invited_by` for referrals — see below), `games`, `game_seats`, `coin_ledger` (append-only, source of truth for Coins), `messages` (full per-Turn transcript, `game_id`/`seat_index`/`round`/`text` — joined with `games.persona_id`/`model_id` this is the bot-tuning review data, queried directly, no export tooling), `play_history`, `game_feedback` (the Result-screen star rating + optional comment, reviewed the same way). Login has two paths in `routes/auth.ts`, both rate-limited tighter than the server default since either mints a free account: `/api/auth/mock-login` (creates a player from a client-picked nickname/avatar, no verification — kept live even once Google login is configured, for local dev and the smoke test) and real Google Sign-In (`/api/auth/google-login` + `/api/auth/google-signup`, ID-token verification via `google-auth-library`, gated on `GOOGLE_CLIENT_ID` — unset, mock-login is the only path). Either way every downstream route only ever deals with an opaque `playerId`, which is also the only per-request credential — holding an id is enough to act as that player (`docs/SPEC.md` §12.5 tracks the implication for a future paid tier).

Every player gets a unique `invite_code` (`nanoid(8)`) at signup; `invited_by` is set at most once (`WHERE invited_by IS NULL` in `db/index.ts: applyInvite`), which is what makes "one inviter per player" hold. A signup body carrying a valid `inviteCode` pays `CONFIG.inviteRewardCoins` to both sides via the existing `adjustCoins`; an invalid/self code is a silent no-op, never a signup error. `web/src/App.tsx` captures a shared `/#/?ref=CODE` link into `localStorage['botcha_invite_ref']` on boot so Onboarding can prefill it.

Firebase is opt-in throughout, same pattern as `OPENROUTER_API_KEY`: unset config vars mean that piece is a no-op, not an error. All analytics are client-side via `web/src/firebase.ts: trackEvent()` (`VITE_FIREBASE_*`) — `GameContext.tsx` fires `queue_join`/`game_start`/`guess_submit`/`game_result`, plus a `multi_bot_room` event held back until Reveal (never earlier — SPEC §4 forbids the client from knowing the Bot count before then); `Landing.tsx`/`Onboarding.tsx`/`Result.tsx`/`Home.tsx` fire the signup-and-share funnel (`landing_view`, `signup_start`, `signup_complete`, `share_tap`). There is no server-side analytics call anywhere in the codebase. Hearts-refill push notifications are `server/src/scheduler.ts`, a 15-minute `setInterval` sweep using `firebase-admin` (`FIREBASE_SERVICE_ACCOUNT_JSON`) — background push also needs `web/public/sw.js`'s `FIREBASE_CONFIG` filled in by hand, since that file is a static asset Vite doesn't build.

## Deployment

Live at `botcha.far2ad.space` on a single VPS behind the provider's HAProxy panel (not a normal reverse proxy). This repo is being prepared to go public, so the runbook with the host, SSH access, and box layout lives outside it, in the private parent repo: `../docs/botcha-deploy.md`. Read it before touching prod.

Short version: push to `main`, fast-forward pull on the box, then reinstall+restart only the half that changed — server via systemd unit `botcha`, web via rebuild + nginx static. `BOT_TEST` must stay unset there.
