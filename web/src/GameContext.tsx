import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { fetchPlayer, mockLogin, wsUrl } from './api';
import type { ChatMessage, GamePhase, Player, RevealData, ResultData, RosterEntry } from './types';

type State = {
  player: Player | null;
  phase: GamePhase;
  onlineCount: number;
  queueSize: number;
  queueBlocked: string | null;
  gameId: string | null;
  mySeatIndex: number | null;
  roster: RosterEntry[];
  round: number;
  turnSeatIndex: number | null;
  turnDeadline: number | null;
  messages: ChatMessage[];
  silentSeats: number[];
  guessDeadline: number | null;
  votedCount: number;
  votedTotal: number;
  myGuess: number | null;
  reveal: RevealData | null;
  result: ResultData | null;
  cancelReason: string | null;
};

const initialState: State = {
  player: null,
  phase: 'idle',
  onlineCount: 0,
  queueSize: 0,
  queueBlocked: null,
  gameId: null,
  mySeatIndex: null,
  roster: [],
  round: 0,
  turnSeatIndex: null,
  turnDeadline: null,
  messages: [],
  silentSeats: [],
  guessDeadline: null,
  votedCount: 0,
  votedTotal: 4,
  myGuess: null,
  reveal: null,
  result: null,
  cancelReason: null
};

type Action = { type: string; [key: string]: any };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, player: action.player };
    case 'PATCH_PLAYER':
      return state.player ? { ...state, player: { ...state.player, ...action.patch } } : state;
    case 'ENTER_QUEUE':
      return { ...state, phase: 'queue', queueBlocked: null };
    case 'LEAVE_QUEUE':
      return { ...state, phase: 'idle' };
    case 'queue.update':
      return { ...state, onlineCount: action.onlineCount, queueSize: action.queueSize };
    case 'queue.blocked':
      return { ...state, queueBlocked: action.reason };
    case 'game.start':
      return {
        ...state,
        phase: 'roster',
        gameId: action.gameId,
        mySeatIndex: action.yourSeatIndex,
        roster: action.roster,
        round: 0,
        turnSeatIndex: null,
        messages: [],
        silentSeats: [],
        myGuess: null,
        reveal: null,
        result: null,
        cancelReason: null
      };
    case 'ENTER_CHAT':
      return { ...state, phase: 'chat' };
    case 'turn.begin':
      return { ...state, round: action.round, turnSeatIndex: action.seatIndex, turnDeadline: action.deadline };
    case 'turn.message':
      return {
        ...state,
        messages: [...state.messages, { seatIndex: action.seatIndex, round: action.round, text: action.text }]
      };
    case 'turn.skipped':
      return { ...state };
    case 'badge.silent':
      return { ...state, silentSeats: [...new Set([...state.silentSeats, action.seatIndex])] };
    case 'guess.begin':
      return { ...state, phase: 'guess', guessDeadline: action.deadline, votedCount: 0 };
    case 'guess.progress':
      return { ...state, votedCount: action.votedCount, votedTotal: action.total };
    case 'SET_MY_GUESS':
      return { ...state, myGuess: action.seatIndex };
    case 'reveal':
      return {
        ...state,
        phase: 'reveal',
        reveal: { botSeatIndex: action.botSeatIndex, guesses: action.guesses, identities: action.identities }
      };
    case 'game.result':
      return {
        ...state,
        phase: 'result',
        result: {
          outcome: action.outcome,
          scoreDelta: action.scoreDelta,
          coinDelta: action.coinDelta,
          leaderboardRank: action.leaderboardRank,
          botSeatIndex: action.botSeatIndex,
          yourSeatIndex: action.yourSeatIndex
        },
        player: state.player
          ? { ...state.player, score: state.player.score + action.scoreDelta, coins: state.player.coins + action.coinDelta }
          : state.player
      };
    case 'game.cancelled':
      return { ...state, phase: 'cancelled', cancelReason: action.reason };
    case 'RESET_TO_HOME':
      return { ...initialState, player: state.player, onlineCount: state.onlineCount };
    default:
      return state;
  }
}

type Ctx = {
  state: State;
  login: (nickname: string, avatar: string) => Promise<void>;
  resumeSession: () => Promise<boolean>;
  joinQueue: () => void;
  leaveQueue: () => void;
  sendTurnMessage: (text: string) => void;
  submitGuess: (seatIndex: number) => void;
  goHome: () => void;
};

const GameCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = 'botcha_player_id';

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const outboxRef = useRef<unknown[]>([]);

  const connect = useCallback((playerId: string) => {
    const ws = new WebSocket(wsUrl(playerId));
    wsRef.current = ws;
    ws.onopen = () => {
      for (const msg of outboxRef.current) ws.send(JSON.stringify(msg));
      outboxRef.current = [];
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        dispatch(msg);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
  }, []);

  const login = useCallback(
    async (nickname: string, avatar: string) => {
      const { player } = await mockLogin(nickname, avatar);
      localStorage.setItem(STORAGE_KEY, player.id);
      dispatch({ type: 'SET_PLAYER', player });
      connect(player.id);
    },
    [connect]
  );

  const resumeSession = useCallback(async () => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return false;
    try {
      const { player } = await fetchPlayer(id);
      dispatch({ type: 'SET_PLAYER', player });
      connect(player.id);
      return true;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }, [connect]);

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      outboxRef.current.push(msg);
    }
  }, []);

  const joinQueue = useCallback(() => {
    dispatch({ type: 'ENTER_QUEUE' });
    send({ type: 'queue.join' });
  }, [send]);

  const leaveQueue = useCallback(() => {
    dispatch({ type: 'LEAVE_QUEUE' });
    send({ type: 'queue.leave' });
  }, [send]);

  const sendTurnMessage = useCallback(
    (text: string) => {
      send({ type: 'turn.message', text });
    },
    [send]
  );

  const submitGuess = useCallback(
    (seatIndex: number) => {
      dispatch({ type: 'SET_MY_GUESS', seatIndex });
      send({ type: 'guess.submit', seatIndex });
    },
    [send]
  );

  const goHome = useCallback(() => {
    dispatch({ type: 'RESET_TO_HOME' });
  }, []);

  // Auto-advance roster -> chat after the server's countdown.
  useEffect(() => {
    if (state.phase !== 'roster') return;
    const t = setTimeout(() => dispatch({ type: 'ENTER_CHAT' }), 3000);
    return () => clearTimeout(t);
  }, [state.phase, state.gameId]);

  // A cancelled game refunds a Heart server-side — pull the fresh count
  // rather than trying to keep a local copy in sync with that logic.
  useEffect(() => {
    if (state.phase !== 'cancelled' || !state.player) return;
    fetchPlayer(state.player.id)
      .then(({ player }) => dispatch({ type: 'SET_PLAYER', player }))
      .catch(() => {});
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({ state, login, resumeSession, joinQueue, leaveQueue, sendTurnMessage, submitGuess, goHome }),
    [state, login, resumeSession, joinQueue, leaveQueue, sendTurnMessage, submitGuess, goHome]
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
