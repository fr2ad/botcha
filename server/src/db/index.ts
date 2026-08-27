import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { CONFIG } from '../config.js';

// Node 22's built-in sqlite module — no native build step, which matters
// because this project targets a plain single VPS with no compile toolchain
// guarantees. Swap for better-sqlite3 later if node:sqlite's still-
// experimental status becomes a problem.
export const db = new DatabaseSync(process.env.DB_PATH ?? 'botcha.sqlite');
// WAL needs shared-memory mmap'd locking that some filesystems (network
// mounts, certain container overlays) reject with a disk I/O error. The
// default rollback journal is plenty for a single-process app.

db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  hearts_remaining INTEGER NOT NULL DEFAULT ${CONFIG.dailyHearts},
  hearts_reset_at TEXT NOT NULL,
  fcm_token TEXT,
  invite_code TEXT,
  invited_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  model_id TEXT,
  persona_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS game_seats (
  game_id TEXT NOT NULL,
  seat_index INTEGER NOT NULL,
  code_name TEXT NOT NULL,
  player_id TEXT,
  silent_badge INTEGER NOT NULL DEFAULT 0,
  guess_seat_index INTEGER,
  score_delta INTEGER,
  coin_delta INTEGER,
  PRIMARY KEY (game_id, seat_index)
);

CREATE TABLE IF NOT EXISTS coin_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  game_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  seat_index INTEGER NOT NULL,
  round INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  outcome TEXT NOT NULL, -- 'correct' | 'wrong' | 'no_guess'
  score_delta INTEGER NOT NULL,
  coin_delta INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Belt-and-suspenders for anyone with a DB file from before fcm_token
// existed — CREATE TABLE IF NOT EXISTS above only applies on a fresh DB.
try {
  db.exec(`ALTER TABLE players ADD COLUMN fcm_token TEXT`);
} catch {
  // already has the column
}
try {
  db.exec(`ALTER TABLE players ADD COLUMN invite_code TEXT`);
} catch {
  // already has the column
}
try {
  db.exec(`ALTER TABLE players ADD COLUMN invited_by TEXT`);
} catch {
  // already has the column
}
// A separate index rather than an inline UNIQUE column constraint — works the
// same whether invite_code came from CREATE TABLE (fresh DB) or ALTER TABLE
// above (existing DB), and IF NOT EXISTS makes it safe to run every boot.
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_players_invite_code ON players(invite_code)`);

// Backfill for players created before invite_code existed — the ALTER TABLE
// above only adds the column, it can't retroactively populate it, so any
// pre-existing account was stuck with invite_code = NULL (shown as the
// literal string "null" in a share link/profile card). One-by-one UPDATE
// because each row needs its own unique code, not a single bulk value.
{
  const withoutCode = db.prepare(`SELECT id FROM players WHERE invite_code IS NULL`).all() as Array<{ id: string }>;
  for (const { id } of withoutCode) {
    db.prepare(`UPDATE players SET invite_code = ? WHERE id = ?`).run(nanoid(8), id);
  }
}

export type PlayerRow = {
  id: string;
  google_id: string;
  nickname: string;
  avatar: string;
  coins: number;
  score: number;
  hearts_remaining: number;
  hearts_reset_at: string;
  fcm_token: string | null;
  invite_code: string;
  invited_by: string | null;
  created_at: string;
};

function todayResetStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export function ensureDailyHeartsReset(player: PlayerRow): PlayerRow {
  const stamp = todayResetStamp();
  if (player.hearts_reset_at !== stamp) {
    db.prepare(
      `UPDATE players SET hearts_remaining = ?, hearts_reset_at = ? WHERE id = ?`
    ).run(CONFIG.dailyHearts, stamp, player.id);
    return { ...player, hearts_remaining: CONFIG.dailyHearts, hearts_reset_at: stamp };
  }
  return player;
}

// Proactive counterpart to the lazy per-read reset above — run periodically
// (scheduler.ts) so a refill can trigger a push even if the player's client
// never happens to poll right at UTC midnight. Only touches players who are
// both stale *and* below max, so it never re-notifies someone already full.
export function refillDueHearts(): Array<{ id: string; fcmToken: string }> {
  const stamp = todayResetStamp();
  const due = db
    .prepare(
      `SELECT id, fcm_token FROM players WHERE hearts_reset_at != ? AND hearts_remaining < ? AND fcm_token IS NOT NULL`
    )
    .all(stamp, CONFIG.dailyHearts) as Array<{ id: string; fcm_token: string }>;
  db.prepare(`UPDATE players SET hearts_remaining = ?, hearts_reset_at = ? WHERE hearts_reset_at != ?`).run(
    CONFIG.dailyHearts,
    stamp,
    stamp
  );
  return due.map((p) => ({ id: p.id, fcmToken: p.fcm_token }));
}

export function setFcmToken(playerId: string, token: string) {
  db.prepare(`UPDATE players SET fcm_token = ? WHERE id = ?`).run(token, playerId);
}

export function getPlayer(id: string): PlayerRow | undefined {
  const p = db.prepare(`SELECT * FROM players WHERE id = ?`).get(id) as PlayerRow | undefined;
  return p ? ensureDailyHeartsReset(p) : undefined;
}

export function getPlayerByGoogleId(googleId: string): PlayerRow | undefined {
  const p = db.prepare(`SELECT * FROM players WHERE google_id = ?`).get(googleId) as PlayerRow | undefined;
  return p ? ensureDailyHeartsReset(p) : undefined;
}

export function createPlayer(input: { id: string; googleId: string; nickname: string; avatar: string }): PlayerRow {
  db.prepare(
    `INSERT INTO players (id, google_id, nickname, avatar, coins, score, hearts_remaining, hearts_reset_at, invite_code)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
  ).run(
    input.id,
    input.googleId,
    input.nickname,
    input.avatar,
    CONFIG.signupBonusCoins,
    CONFIG.dailyHearts,
    todayResetStamp(),
    nanoid(8)
  );
  db.prepare(`INSERT INTO coin_ledger (player_id, delta, reason) VALUES (?, ?, 'signup_bonus')`).run(
    input.id,
    CONFIG.signupBonusCoins
  );
  return getPlayer(input.id)!;
}

export function getPlayerByInviteCode(code: string): PlayerRow | undefined {
  const p = db.prepare(`SELECT * FROM players WHERE invite_code = ?`).get(code) as PlayerRow | undefined;
  return p ? ensureDailyHeartsReset(p) : undefined;
}

// Silently no-ops on a bad/self code rather than erroring — a mistyped
// invite shouldn't block signup. `invited_by IS NULL` in the WHERE is what
// makes "only one inviter, ever" hold even under a racing double-call.
export function applyInvite(newPlayerId: string, code: string): boolean {
  const inviter = getPlayerByInviteCode(code);
  if (!inviter || inviter.id === newPlayerId) return false;
  const result = db
    .prepare(`UPDATE players SET invited_by = ? WHERE id = ? AND invited_by IS NULL`)
    .run(inviter.id, newPlayerId);
  if (result.changes === 0) return false;
  adjustCoins(inviter.id, CONFIG.inviteRewardCoins.inviter, 'invite_reward');
  adjustCoins(newPlayerId, CONFIG.inviteRewardCoins.invitee, 'invite_bonus');
  return true;
}

export function setAvatar(playerId: string, avatar: string) {
  db.prepare(`UPDATE players SET avatar = ? WHERE id = ?`).run(avatar, playerId);
}

export function adjustCoins(playerId: string, delta: number, reason: string, gameId?: string) {
  db.prepare(`UPDATE players SET coins = coins + ? WHERE id = ?`).run(delta, playerId);
  db.prepare(`INSERT INTO coin_ledger (player_id, delta, reason, game_id) VALUES (?, ?, ?, ?)`).run(
    playerId,
    delta,
    reason,
    gameId ?? null
  );
}

export function adjustScore(playerId: string, delta: number) {
  db.prepare(`UPDATE players SET score = score + ? WHERE id = ?`).run(delta, playerId);
}

export function canAffordEntry(playerId: string): boolean {
  const player = getPlayer(playerId);
  if (!player) return false;
  return player.hearts_remaining > 0 || player.coins >= CONFIG.coinEntryPrice;
}

export function spendHeartOrCoin(playerId: string): { paidWith: 'heart' | 'coin' } | { error: string } {
  const player = getPlayer(playerId);
  if (!player) return { error: 'player not found' };
  if (player.hearts_remaining > 0) {
    db.prepare(`UPDATE players SET hearts_remaining = hearts_remaining - 1 WHERE id = ?`).run(playerId);
    return { paidWith: 'heart' };
  }
  if (player.coins >= CONFIG.coinEntryPrice) {
    adjustCoins(playerId, -CONFIG.coinEntryPrice, 'coin_entry');
    return { paidWith: 'coin' };
  }
  return { error: 'no hearts or coins' };
}

export function refundHeart(playerId: string) {
  db.prepare(`UPDATE players SET hearts_remaining = MIN(hearts_remaining + 1, ?) WHERE id = ?`).run(
    CONFIG.dailyHearts,
    playerId
  );
}

export function recordGameStart(gameId: string, modelId: string, personaId: string) {
  db.prepare(`INSERT INTO games (id, model_id, persona_id, status) VALUES (?, ?, ?, 'in_progress')`).run(
    gameId,
    modelId,
    personaId
  );
}

export function recordGameEnd(gameId: string, status: 'finished' | 'cancelled') {
  db.prepare(`UPDATE games SET ended_at = datetime('now'), status = ? WHERE id = ?`).run(status, gameId);
}

export function recordSeat(gameId: string, seatIndex: number, codeName: string, playerId: string | null) {
  db.prepare(
    `INSERT INTO game_seats (game_id, seat_index, code_name, player_id) VALUES (?, ?, ?, ?)`
  ).run(gameId, seatIndex, codeName, playerId);
}

export function finalizeSeat(
  gameId: string,
  seatIndex: number,
  fields: { silentBadge: boolean; guessSeatIndex: number | null; scoreDelta: number; coinDelta: number }
) {
  db.prepare(
    `UPDATE game_seats SET silent_badge = ?, guess_seat_index = ?, score_delta = ?, coin_delta = ?
     WHERE game_id = ? AND seat_index = ?`
  ).run(
    fields.silentBadge ? 1 : 0,
    fields.guessSeatIndex,
    fields.scoreDelta,
    fields.coinDelta,
    gameId,
    seatIndex
  );
}

export function recordMessage(gameId: string, seatIndex: number, round: number, text: string) {
  db.prepare(`INSERT INTO messages (game_id, seat_index, round, text) VALUES (?, ?, ?, ?)`).run(
    gameId,
    seatIndex,
    round,
    text
  );
}

export function recordHistory(
  playerId: string,
  gameId: string,
  outcome: 'correct' | 'wrong' | 'no_guess',
  scoreDelta: number,
  coinDelta: number
) {
  db.prepare(
    `INSERT INTO play_history (player_id, game_id, outcome, score_delta, coin_delta) VALUES (?, ?, ?, ?, ?)`
  ).run(playerId, gameId, outcome, scoreDelta, coinDelta);
}

export function getLeaderboard(limit = 50) {
  return db
    .prepare(`SELECT id, nickname, avatar, score, coins FROM players ORDER BY score DESC LIMIT ?`)
    .all(limit) as Array<{ id: string; nickname: string; avatar: string; score: number; coins: number }>;
}

export function getPlayerRank(playerId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) + 1 as rank FROM players WHERE score > (SELECT score FROM players WHERE id = ?)`
    )
    .get(playerId) as { rank: number };
  return row.rank;
}

export function recordFeedback(gameId: string, playerId: string, rating: number, comment: string | null) {
  db.prepare(`INSERT INTO game_feedback (game_id, player_id, rating, comment) VALUES (?, ?, ?, ?)`).run(
    gameId,
    playerId,
    rating,
    comment
  );
}

export function getPlayerHistory(playerId: string) {
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN outcome = 'correct' THEN 1 ELSE 0 END) as correct,
         SUM(CASE WHEN outcome = 'wrong' THEN 1 ELSE 0 END) as wrong,
         SUM(CASE WHEN outcome = 'no_guess' THEN 1 ELSE 0 END) as no_guess,
         COUNT(*) as games
       FROM play_history WHERE player_id = ?`
    )
    .get(playerId) as { correct: number; wrong: number; no_guess: number; games: number };
  return {
    correct: row.correct ?? 0,
    wrong: row.wrong ?? 0,
    noGuess: row.no_guess ?? 0,
    games: row.games ?? 0
  };
}
