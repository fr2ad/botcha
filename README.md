# Botcha

Multiplayer reverse-Turing-test game. See [`docs/SPEC.md`](../docs/SPEC.md) for the full spec, [`docs/CONTEXT.md`](../CONTEXT.md) for the glossary, and [`docs/adr/`](../docs/adr/) for design decisions.

This is the MVP implementation: 4-seat rooms (3 humans + 1 bot), turn-based chat, private guess phase, reveal, scoring/economy, and a leaderboard. Google login is **mocked** — pick a nickname/avatar and you're in, no OAuth wired up yet.

## Structure

```
botcha/
  server/   Fastify + WebSocket + SQLite backend (TypeScript)
  web/      React + Vite frontend (TypeScript)
```

## Run it locally

Two terminals:

```bash
# terminal 1 — backend, http://localhost:8787
cd server
npm install
npm run dev

# terminal 2 — frontend, http://localhost:5173
cd web
npm install
npm run dev
```

Open `http://localhost:5173`, sign up with a nickname, and open a **second and third browser tab/window** (or ask two friends) to fill the other two human seats — a room needs 3 humans + 1 bot to start. Each browser tab is tracked by a `botcha_player_id` in `localStorage`, so incognito windows or separate browsers work well for testing solo.

Without an `OPENROUTER_API_KEY`, the bot uses canned mock replies (still passes turns, still gets guessed on) so you can play the full loop with zero external dependencies. To wire a real model, copy `server/.env.example` to `server/.env` and set `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL` — default is a cheap Llama 3.1 8B).

## What's real vs. stubbed

Real: matchmaking queue, turn-based chat state machine (3 rounds × 15s turns), Silent Player badges, private guess phase, reveal, scoring (+20/-10), coins (signup bonus, correct-guess reward, coin-entry), daily Hearts with reset, SQLite-backed leaderboard and play history, prompt-injection-resistant bot personas, client-side PNG share card.

Stubbed for MVP (per `docs/SPEC.md` §9 — deliberately out of scope, not forgotten): real Google OAuth, payment gateway (coin purchase / Premium), 7/10-seat rooms, Expert difficulty, Pin Question, private rooms.

## Notes on the backend

- Uses Node 22's built-in `node:sqlite` instead of `better-sqlite3` — zero native build step, which matters for a single cheap VPS with no guaranteed compiler toolchain. It's still an experimental Node API; revisit if that becomes a problem.
- All game/economy numbers (turn length, round count, scoring, prices) live in one place: `server/src/config.ts`, matching `docs/SPEC.md` §8.
- Room state is in-memory (a room lives ~2–4 minutes); only finished/cancelled games and player state persist to SQLite, per the architecture decision to avoid a database round-trip mid-turn.
