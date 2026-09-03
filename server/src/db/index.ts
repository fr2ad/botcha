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
  hearts_remaining INTEGER NOT NULL DEFAULT ${CONFIG.maxHearts},
  hearts_reset_at TEXT NOT NULL,
  heart_regen_at INTEGER,
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
try {
  db.exec(`ALTER TABLE players ADD COLUMN heart_regen_at INTEGER`);
} catch {
  // already has the column
}
// Anyone with hearts_remaining < maxHearts from before this column existed
// has no regen timer running yet — start one now rather than leaving them
// stuck below max forever (heart_regen_at stays NULL, which the read path
// treats as "at max, nothing to regenerate").
db.prepare(
  `UPDATE players SET heart_regen_at = ? WHERE heart_regen_at IS NULL AND hearts_remaining < ?`
).run(Date.now() + CONFIG.heartRegenMs, CONFIG.maxHearts);
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
  heart_regen_at: number | null;
  fcm_token: string | null;
  invite_code: string;
  invited_by: string | null;
  created_at: string;
};

// Kept only so hearts_reset_at (still NOT NULL in the schema — no migration
// framework to drop a column safely, see the ALTER TABLE block above) has
// something to store; nothing reads it for hearts logic any more.
function todayResetStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

// Lazy, per-read regen: while below maxHearts, one Heart is due at
// heart_regen_at and every heartRegenMs after that. Advancing the timer by
// exactly the whole intervals consumed (rather than resetting it to `now`)
// means a partially-elapsed interval's progress is never lost just because
// the player happened to check the app mid-countdown.
export function ensureHeartsRegenerated(player: PlayerRow): PlayerRow {
  if (player.hearts_remaining >= CONFIG.maxHearts || player.heart_regen_at == null) return player;
  const elapsed = Date.now() - player.heart_regen_at;
  if (elapsed < 0) return player;
  const gained = 1 + Math.floor(elapsed / CONFIG.heartRegenMs);
  const heartsRemaining = Math.min(CONFIG.maxHearts, player.hearts_remaining + gained);
  const heartRegenAt = heartsRemaining < CONFIG.maxHearts ? player.heart_regen_at + gained * CONFIG.heartRegenMs : null;
  db.prepare(`UPDATE players SET hearts_remaining = ?, heart_regen_at = ? WHERE id = ?`).run(
    heartsRemaining,
    heartRegenAt,
    player.id
  );
  return { ...player, hearts_remaining: heartsRemaining, heart_regen_at: heartRegenAt };
}

// Proactive counterpart to the lazy per-read regen above — run periodically
// (scheduler.ts) so a refill can trigger a push even if the player's client
// never happens to be open right when a Heart comes due.
export function regenDueHearts(): Array<{ id: string; fcmToken: string }> {
  const now = Date.now();
  const due = db
    .prepare(`SELECT * FROM players WHERE heart_regen_at IS NOT NULL AND heart_regen_at <= ? AND fcm_token IS NOT NULL`)
    .all(now) as PlayerRow[];
  const notified: Array<{ id: string; fcmToken: string }> = [];
  for (const player of due) {
    const before = player.hearts_remaining;
    const after = ensureHeartsRegenerated(player);
    if (after.hearts_remaining > before) notified.push({ id: player.id, fcmToken: player.fcm_token! });
  }
  return notified;
}

export function setFcmToken(playerId: string, token: string) {
  db.prepare(`UPDATE players SET fcm_token = ? WHERE id = ?`).run(token, playerId);
}

export function getPlayer(id: string): PlayerRow | undefined {
  const p = db.prepare(`SELECT * FROM players WHERE id = ?`).get(id) as PlayerRow | undefined;
  return p ? ensureHeartsRegenerated(p) : undefined;
}

export function getPlayerByGoogleId(googleId: string): PlayerRow | undefined {
  const p = db.prepare(`SELECT * FROM players WHERE google_id = ?`).get(googleId) as PlayerRow | undefined;
  return p ? ensureHeartsRegenerated(p) : undefined;
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
    CONFIG.maxHearts,
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
  return p ? ensureHeartsRegenerated(p) : undefined;
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
    // Only start the regen clock on the Heart that drops the player below
    // max — if one's already running (they were already below max), leave
    // it alone, or every spend would push the next Heart's due time back out.
    const wasFull = player.hearts_remaining >= CONFIG.maxHearts;
    const heartRegenAt = wasFull ? Date.now() + CONFIG.heartRegenMs : player.heart_regen_at;
    db.prepare(`UPDATE players SET hearts_remaining = hearts_remaining - 1, heart_regen_at = ? WHERE id = ?`).run(
      heartRegenAt,
      playerId
    );
    return { paidWith: 'heart' };
  }
  if (player.coins >= CONFIG.coinEntryPrice) {
    adjustCoins(playerId, -CONFIG.coinEntryPrice, 'coin_entry');
    return { paidWith: 'coin' };
  }
  return { error: 'no hearts or coins' };
}

export function refundHeart(playerId: string) {
  const player = getPlayer(playerId);
  if (!player) return;
  const heartsRemaining = Math.min(CONFIG.maxHearts, player.hearts_remaining + 1);
  const heartRegenAt = heartsRemaining >= CONFIG.maxHearts ? null : player.heart_regen_at;
  db.prepare(`UPDATE players SET hearts_remaining = ?, heart_regen_at = ? WHERE id = ?`).run(
    heartsRemaining,
    heartRegenAt,
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
