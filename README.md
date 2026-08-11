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

Without an `OPENROUTER_API_KEY`, the bot uses canned mock replies (still passes turns, still gets guessed on) so you can play the full loop with zero external dependencies. To wire a real model, copy `server/.env.example` to `server/.env` and set `OPENROUTER_API_KEY`. The default `OPENROUTER_MODEL` is a $0-cost OpenRouter model (`inclusionai/ling-3.0-tiny:free`) — see the comment in `.env.example` for why that specific one and why it's worth double-checking before relying on it long-term; OpenRouter's free catalog is small and shifts often.

## What's real vs. stubbed

Real: matchmaking queue, turn-based chat state machine (3 rounds × 15s turns), Silent Player badges, private guess phase, reveal, scoring (+20/-10), coins (signup bonus, correct-guess reward, coin-entry), daily Hearts with reset, SQLite-backed leaderboard and play history, prompt-injection-resistant bot personas, client-side PNG share card.

Stubbed for MVP (per `docs/SPEC.md` §9 — deliberately out of scope, not forgotten): real Google OAuth, payment gateway (coin purchase / Premium), 7/10-seat rooms, Expert difficulty, Pin Question, private rooms.

## Deployment

Live at `botcha.far2ad.space`, on a NAT VPS (Ubuntu 24.04, `root@<vps-host> -p <ssh-port>`).

**Why NAT/HAProxy, not a normal reverse proxy setup:** this VPS shares its public IPv4 with other tenants — no port 80/443 of your own, only a private IP (`<private-ip>`) behind the provider's NAT. the provider's dashboard has a built-in **HAProxy** panel (separate from the VPS page) that terminates public 80/443 + TLS and forwards to your VPS's private IP. `botcha.far2ad.space` is already registered there → backend `<private-ip>:80`. Don't try port-forwarding or Cloudflare Tunnel instead — HAProxy panel is the supported path here and already wired up.

Server layout:
- `/opt/botcha` — this repo's `botcha/` dir, git-cloned from `https://github.com/fr2ad/botcha` (origin `main`)
- `/opt/botcha/server` — backend, run via `systemd` unit `botcha.service` (`ExecStart=npx tsx --env-file-if-exists=.env src/server.ts`, port 8787, `.env` holds `OPENROUTER_API_KEY`)
- `/opt/botcha/web/dist` — frontend static build, served directly by nginx
- `/etc/nginx/sites-available/botcha.far2ad.space` — nginx vhost: serves `web/dist` at `/`, proxies `/api/` and `/ws` to `localhost:8787`

### Updating the server

From your machine, in this repo: commit, push to `main`, then pull + rebuild on the box.

```bash
# 1. push
git push origin main

# 2. pull + backend: reinstall deps if package.json changed, then restart
ssh -p <ssh-port> root@<vps-host> 'cd /opt/botcha && git reset --hard origin/main && git pull && \
  cd server && npm install && systemctl restart botcha && systemctl status botcha --no-pager'

# 3. frontend: rebuild and fix perms (dist/ needs to stay readable by nginx)
ssh -p <ssh-port> root@<vps-host> 'cd /opt/botcha/web && npm install && npm run build && \
  find dist -type d -exec chmod 755 {} \; && find dist -type f -exec chmod 644 {} \;'
```

`server/.env`, `server/*.db`, `node_modules/`, and `dist/` are all gitignored, so pulling never touches them.

nginx config itself rarely changes; if it does, edit `/etc/nginx/sites-available/botcha.far2ad.space` on the box, then `nginx -t && systemctl reload nginx`.

Logs: `journalctl -u botcha -f` (backend), `/var/log/nginx/error.log` (nginx/static).

### `recipe.far2ad.space`

Not deployed yet — currently a Cloudflare Worker at `recipe-transcriber.<account>.workers.dev`, planned move to this same box (static files served by nginx, same HAProxy pattern as above).

## Notes on the backend

- Uses Node 22's built-in `node:sqlite` instead of `better-sqlite3` — zero native build step, which matters for a single cheap VPS with no guaranteed compiler toolchain. It's still an experimental Node API; revisit if that becomes a problem.
- All game/economy numbers (turn length, round count, scoring, prices) live in one place: `server/src/config.ts`, matching `docs/SPEC.md` §8.
- Room state is in-memory (a room lives ~2–4 minutes); only finished/cancelled games and player state persist to SQLite, per the architecture decision to avoid a database round-trip mid-turn.
