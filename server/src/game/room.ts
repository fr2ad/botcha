import { nanoid } from 'nanoid';
import { CONFIG, botDelayMs, pickSeatIdentities } from '../config.js';
import { connections, send } from './connections.js';
import type { Seat, RoomPhase } from './types.js';
import { pickPersonas } from '../bot/personas.js';
import { getBotReply, type ChatTurn } from '../bot/client.js';
import {
  adjustCoins,
  adjustScore,
  finalizeSeat,
  getPlayer,
  getPlayerRank,
  recordGameEnd,
  recordGameStart,
  recordHistory,
  recordMessage,
  recordSeat,
  refundHeart
} from '../db/index.js';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Room {
  id = nanoid(10);
  phase: RoomPhase = 'roster';
  round = 0;
  seats: Seat[] = [];
  turnOrder: number[] = [];
  history: ChatTurn[] = [];
  cancelled = false;

  // Tracked purely so a reconnecting client can be handed a resync snapshot
  // (routes/ws.ts) instead of silently missing the rest of the game.
  turnSeatIndex: number | null = null;
  turnDeadline: number | null = null;
  guessDeadline: number | null = null;
  log: Array<{ seatIndex: number; round: number; text: string }> = [];

  // Never 0 Bots (nothing to hunt) and never a Player-less table — the
  // queue only ever hands this humanPlayerIds.length between 1 and
  // seatsPerRoom - 1, so botCount lands in the same range automatically.
  constructor(humanPlayerIds: string[]) {
    const botCount = CONFIG.seatsPerRoom - humanPlayerIds.length;
    const personas = pickPersonas(botCount);
    const codeNames = pickSeatIdentities(CONFIG.seatsPerRoom);
    const allSeatIndexes = Array.from({ length: CONFIG.seatsPerRoom }, (_, i) => i);
    const botSeatIndexes = new Set(shuffle(allSeatIndexes).slice(0, botCount));
    const humanOrder = shuffle(humanPlayerIds);
    let personaI = 0;

    for (let i = 0; i < CONFIG.seatsPerRoom; i++) {
      if (botSeatIndexes.has(i)) {
        const persona = personas[personaI++];
        this.seats.push({
          index: i,
          codeName: codeNames[i].name,
          color: codeNames[i].color,
          kind: 'bot',
          playerId: null,
          nickname: persona.fakeNickname,
          avatar: persona.fakeAvatar,
          persona,
          skippedTurns: 0,
          silentBadge: false,
          guessSeatIndex: null,
          connected: true
        });
      } else {
        const playerId = humanOrder.pop()!;
        const player = getPlayer(playerId)!;
        this.seats.push({
          index: i,
          codeName: codeNames[i].name,
          color: codeNames[i].color,
          kind: 'human',
          playerId,
          nickname: player.nickname,
          avatar: player.avatar,
          persona: null,
          skippedTurns: 0,
          silentBadge: false,
          guessSeatIndex: null,
          connected: true
        });
      }
    }

    this.turnOrder = shuffle(this.seats.map((s) => s.index));
    recordGameStart(this.id, process.env.OPENROUTER_MODEL ?? 'mock', personas.map((p) => p.id).join(','));
    for (const seat of this.seats) recordSeat(this.id, seat.index, seat.codeName, seat.playerId);

    for (const seat of this.seats) {
      if (seat.playerId) {
        const conn = connections.get(seat.playerId);
        if (conn) conn.gameId = this.id;
      }
    }
  }

  humanSeats() {
    return this.seats.filter((s) => s.kind === 'human');
  }

  connectedHumanCount() {
    return this.humanSeats().filter((s) => s.connected).length;
  }

  broadcast(msg: unknown) {
    for (const seat of this.humanSeats()) {
      if (seat.playerId) send(seat.playerId, msg);
    }
  }

  publicRoster() {
    // Pre-game roster: real nicknames/avatars shown for all 4 (bot's identity is fake but indistinguishable).
    return this.seats.map((s) => ({
      seatIndex: s.index,
      codeName: s.codeName,
      color: s.color,
      nickname: s.nickname,
      avatar: s.avatar
    }));
  }

  // What a reconnecting client needs to jump straight back into the right
  // screen instead of landing on Home with a stale, phase-less state.
  snapshotFor(seat: Seat) {
    return {
      type: 'game.resync',
      phase: this.phase,
      gameId: this.id,
      yourSeatIndex: seat.index,
      roster: this.publicRoster(),
      round: this.round,
      messages: this.log,
      silentSeats: this.seats.filter((s) => s.silentBadge).map((s) => s.index),
      turnSeatIndex: this.turnSeatIndex,
      turnDeadline: this.turnDeadline,
      guessDeadline: this.guessDeadline
    };
  }

  handleDisconnect(playerId: string) {
    const seat = this.seats.find((s) => s.playerId === playerId);
    if (!seat) return;
    seat.connected = false;
    if (this.phase !== 'result' && this.phase !== 'cancelled' && this.connectedHumanCount() < CONFIG.minHumansToContinue) {
      this.cancelForDisconnect();
    }
  }

  private cancelForDisconnect() {
    this.cancelled = true;
    this.phase = 'cancelled';
    const survivor = this.humanSeats().find((s) => s.connected);
    if (survivor?.playerId) {
      refundHeart(survivor.playerId);
      send(survivor.playerId, { type: 'game.cancelled', reason: 'not_enough_players', heartRefunded: true });
    }
    recordGameEnd(this.id, 'cancelled');
  }

  async run() {
    const roster = this.publicRoster();
    for (const seat of this.humanSeats()) {
      if (seat.playerId) {
        send(seat.playerId, {
          type: 'game.start',
          gameId: this.id,
          roster,
          startsInMs: 3000,
          yourSeatIndex: seat.index
        });
      }
    }
    await sleep(3000);
    if (this.cancelled) return;

    this.phase = 'chat';
    for (let round = 1; round <= CONFIG.tableRounds; round++) {
      this.round = round;
      for (const seatIndex of this.turnOrder) {
        if (this.cancelled) return;
        await this.runTurn(this.seats[seatIndex], round);
        if (this.cancelled) return;
      }
    }

    // Grace pause so the last chat message is visible before the screen
    // switches to the guess phase (was flipping mid-render, see bug report).
    await sleep(2500);
    if (this.cancelled) return;

    await this.runGuessPhase();
    if (this.cancelled) return;
    await this.runReveal();
  }

  private async runTurn(seat: Seat, round: number) {
    const deadline = Date.now() + CONFIG.turnWindowMs;
    this.turnSeatIndex = seat.index;
    this.turnDeadline = deadline;
    this.broadcast({ type: 'turn.begin', seatIndex: seat.index, round, deadline });

    let text: string | null = null;
    if (seat.kind === 'bot') {
      const startedAt = Date.now();
      text = await raceWithTimeout(
        getBotReply(seat.persona!, this.history, round, seat.codeName),
        CONFIG.turnWindowMs
      );
      await sleep(botDelayMs(text ?? '', Date.now() - startedAt, deadline));
    } else if (seat.connected && seat.playerId) {
      text = await waitForTurnMessage(seat.playerId, CONFIG.turnWindowMs);
    } else {
      await sleep(Math.min(CONFIG.turnWindowMs, 300));
    }

    if (this.cancelled) return;

    if (text && text.trim()) {
      const clean = text.trim().slice(0, CONFIG.maxMessageLength);
      seat.skippedTurns = 0;
      this.history.push({ speaker: seat.codeName, text: clean });
      this.log.push({ seatIndex: seat.index, round, text: clean });
      recordMessage(this.id, seat.index, round, clean);
      this.broadcast({ type: 'turn.message', seatIndex: seat.index, round, text: clean });
    } else {
      seat.skippedTurns += 1;
      this.broadcast({ type: 'turn.skipped', seatIndex: seat.index, round });
      if (seat.skippedTurns >= CONFIG.silentBadgeAfterSkips && !seat.silentBadge) {
        seat.silentBadge = true;
        this.broadcast({ type: 'badge.silent', seatIndex: seat.index });
      }
    }
  }

  private async runGuessPhase() {
    this.phase = 'guess';
    const deadline = Date.now() + CONFIG.guessWindowMs;
    this.turnSeatIndex = null;
    this.turnDeadline = null;
    this.guessDeadline = deadline;
    this.broadcast({ type: 'guess.begin', deadline });

    const humans = this.humanSeats().filter((s) => s.connected && s.playerId);
    const botSeats = this.seats.filter((s) => s.kind === 'bot');
    const votedSeatIndexes = new Set<number>();

    // Each Bot seat "votes" on its own randomized delay, independently of
    // the others — if they all resolved together, three Bots finishing in
    // lockstep would itself be a tell.
    const botVotePromises = botSeats.map((botSeat) =>
      (async () => {
        await sleep(1000 + Math.random() * (CONFIG.guessWindowMs - 3000));
        votedSeatIndexes.add(botSeat.index);
        this.broadcast({ type: 'guess.progress', votedCount: votedSeatIndexes.size, total: this.seats.length });
      })()
    );

    const humanVotePromises = humans.map(async (seat) => {
      const guess = await waitForGuess(seat.playerId!, CONFIG.guessWindowMs);
      seat.guessSeatIndex = guess;
      votedSeatIndexes.add(seat.index);
      this.broadcast({ type: 'guess.progress', votedCount: votedSeatIndexes.size, total: this.seats.length });
    });

    await Promise.race([
      Promise.all([...humanVotePromises, ...botVotePromises]),
      sleep(CONFIG.guessWindowMs).then(() => undefined)
    ]);
    void deadline;
  }

  private async runReveal() {
    this.phase = 'reveal';
    const botSeats = this.seats.filter((s) => s.kind === 'bot');
    const botSeatIndexes = botSeats.map((s) => s.index);

    const guesses = this.seats
      .filter((s) => s.kind === 'human')
      .map((s) => ({ seatIndex: s.index, guessSeatIndex: s.guessSeatIndex }));

    this.broadcast({
      type: 'reveal',
      botSeatIndexes,
      guesses,
      identities: this.seats.map((s) => ({ seatIndex: s.index, nickname: s.nickname, avatar: s.avatar, isBot: s.kind === 'bot' }))
    });

    // Let the reveal land before the result screen replaces it — these used to
    // go out in the same tick, so the unmasking flashed past unseen. Long
    // enough to read four seats' guesses, not so long it drags.
    await sleep(6000);

    for (const seat of this.humanSeats()) {
      if (!seat.playerId) continue;
      const correct = seat.guessSeatIndex !== null && botSeatIndexes.includes(seat.guessSeatIndex);
      const madeGuess = seat.guessSeatIndex !== null;
      const scoreDelta = correct ? CONFIG.correctGuess.score : CONFIG.wrongOrNoGuess.score;
      const coinDelta = correct ? CONFIG.correctGuess.coins : CONFIG.wrongOrNoGuess.coins;

      adjustScore(seat.playerId, scoreDelta);
      if (coinDelta !== 0) adjustCoins(seat.playerId, coinDelta, correct ? 'correct_guess' : 'wrong_guess', this.id);
      const outcome = correct ? 'correct' : madeGuess ? 'wrong' : 'no_guess';
      recordHistory(seat.playerId, this.id, outcome, scoreDelta, coinDelta);
      finalizeSeat(this.id, seat.index, {
        silentBadge: seat.silentBadge,
        guessSeatIndex: seat.guessSeatIndex,
        scoreDelta,
        coinDelta
      });

      const rank = getPlayerRank(seat.playerId);
      send(seat.playerId, {
        type: 'game.result',
        outcome,
        scoreDelta,
        coinDelta,
        leaderboardRank: rank,
        botSeatIndexes,
        yourSeatIndex: seat.index
      });
    }

    this.phase = 'result';
    recordGameEnd(this.id, 'finished');

    for (const seat of this.humanSeats()) {
      if (seat.playerId) {
        const conn = connections.get(seat.playerId);
        if (conn) conn.gameId = null;
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function raceWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, sleep(ms).then(() => '' as unknown as T)]);
}

function waitForTurnMessage(playerId: string, ms: number): Promise<string | null> {
  return new Promise((resolve) => {
    const conn = connections.get(playerId);
    if (!conn) return resolve(null);
    const timer = setTimeout(() => {
      conn.pendingTurnResolve = undefined;
      resolve(null);
    }, ms);
    conn.pendingTurnResolve = (text) => {
      clearTimeout(timer);
      conn.pendingTurnResolve = undefined;
      resolve(text);
    };
  });
}

function waitForGuess(playerId: string, ms: number): Promise<number | null> {
  return new Promise((resolve) => {
    const conn = connections.get(playerId);
    if (!conn) return resolve(null);
    const timer = setTimeout(() => {
      conn.pendingGuessResolve = undefined;
      resolve(null);
    }, ms);
    conn.pendingGuessResolve = (seatIndex) => {
      clearTimeout(timer);
      conn.pendingGuessResolve = undefined;
      resolve(seatIndex);
    };
  });
}
