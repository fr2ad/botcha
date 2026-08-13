import { nanoid } from 'nanoid';
import { CONFIG, pickSeatIdentities } from '../config.js';
import { connections, send } from './connections.js';
import type { Seat, RoomPhase } from './types.js';
import { pickPersona, type Persona } from '../bot/personas.js';
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
  persona: Persona;
  history: ChatTurn[] = [];
  cancelled = false;

  constructor(humanPlayerIds: string[]) {
    this.persona = pickPersona();
    const codeNames = pickSeatIdentities(CONFIG.seatsPerRoom);
    const botSeatIndex = Math.floor(Math.random() * CONFIG.seatsPerRoom);
    const humanOrder = shuffle(humanPlayerIds);

    for (let i = 0; i < CONFIG.seatsPerRoom; i++) {
      if (i === botSeatIndex) {
        this.seats.push({
          index: i,
          codeName: codeNames[i].name,
          color: codeNames[i].color,
          kind: 'bot',
          playerId: null,
          nickname: this.persona.fakeNickname,
          avatar: this.persona.fakeAvatar,
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
          skippedTurns: 0,
          silentBadge: false,
          guessSeatIndex: null,
          connected: true
        });
      }
    }

    this.turnOrder = shuffle(this.seats.map((s) => s.index));
    recordGameStart(this.id, process.env.OPENROUTER_MODEL ?? 'mock', this.persona.id);
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
    this.broadcast({ type: 'turn.begin', seatIndex: seat.index, round, deadline });

    let text: string | null = null;
    if (seat.kind === 'bot') {
      text = await raceWithTimeout(
        getBotReply(this.persona, this.history, round),
        CONFIG.turnWindowMs
      );
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
    this.broadcast({ type: 'guess.begin', deadline });

    const humans = this.humanSeats().filter((s) => s.connected && s.playerId);
    const votedSeatIndexes = new Set<number>();

    const botVotePromise = (async () => {
      await sleep(1000 + Math.random() * (CONFIG.guessWindowMs - 3000));
      const botSeat = this.seats.find((s) => s.kind === 'bot')!;
      votedSeatIndexes.add(botSeat.index);
      this.broadcast({ type: 'guess.progress', votedCount: votedSeatIndexes.size, total: this.seats.length });
    })();

    const humanVotePromises = humans.map(async (seat) => {
      const guess = await waitForGuess(seat.playerId!, CONFIG.guessWindowMs);
      seat.guessSeatIndex = guess;
      votedSeatIndexes.add(seat.index);
      this.broadcast({ type: 'guess.progress', votedCount: votedSeatIndexes.size, total: this.seats.length });
    });

    await Promise.race([
      Promise.all([...humanVotePromises, botVotePromise]),
      sleep(CONFIG.guessWindowMs).then(() => undefined)
    ]);
    void deadline;
  }

  private async runReveal() {
    this.phase = 'reveal';
    const botSeat = this.seats.find((s) => s.kind === 'bot')!;

    const guesses = this.seats
      .filter((s) => s.kind === 'human')
      .map((s) => ({ seatIndex: s.index, guessSeatIndex: s.guessSeatIndex }));

    this.broadcast({
      type: 'reveal',
      botSeatIndex: botSeat.index,
      guesses,
      identities: this.seats.map((s) => ({ seatIndex: s.index, nickname: s.nickname, avatar: s.avatar, isBot: s.kind === 'bot' }))
    });

    // Let the reveal land before the result screen replaces it — these used to
    // go out in the same tick, so the unmasking flashed past unseen. Long
    // enough to read four seats' guesses, not so long it drags.
    await sleep(6000);

    for (const seat of this.humanSeats()) {
      if (!seat.playerId) continue;
      const correct = seat.guessSeatIndex === botSeat.index;
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
        botSeatIndex: botSeat.index,
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
