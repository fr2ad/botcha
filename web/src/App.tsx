import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GameProvider, useGame } from './GameContext';
import { Ambient } from './components/Ambient';
import { Wordmark } from './components/Wordmark';
import { Landing } from './screens/Landing';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Queue } from './screens/Queue';
import { Roster } from './screens/Roster';
import { Table } from './screens/Table';
import { Guess } from './screens/Guess';
import { Reveal } from './screens/Reveal';
import { Result } from './screens/Result';
import { Leaderboard } from './screens/Leaderboard';
import { BotTest } from './screens/BotTest';
import { Privacy } from './screens/Privacy';
import { Terms } from './screens/Terms';
import { SessionEnded } from './screens/SessionEnded';
import type { GamePhase } from './types';

function Splash() {
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ambient washTop={-140} />
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 26,
          background: 'linear-gradient(160deg,#8d7ffb,var(--accent-deep))',
          boxShadow: '0 0 44px rgba(124,110,246,.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '6px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: '#fff',
              animation: 'eyeScan 3s ease-in-out infinite'
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <Wordmark size={30} />
      </div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>1-3 bots at the table. Find them.</div>

      <div style={{ position: 'absolute', bottom: 64, display: 'flex', gap: 7 }}>
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: `blink 1.2s ease ${delay}s infinite`
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Boot({ children }: { children: React.ReactNode }) {
  const { state, resumeSession } = useGame();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Captures a shared `/#/?ref=CODE` invite link so Onboarding can prefill
    // it, whether or not this visitor is already logged in.
    if (!state.player) {
      const ref = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref');
      if (ref) localStorage.setItem('botcha_invite_ref', ref);
    }
    resumeSession().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <Splash />;
  return <>{children}</>;
}

// Maps a resynced phase to the screen that renders it — only consulted when
// the user is sitting on Home/landing while the phase says otherwise, which
// can only happen right after a reconnect resync (GameContext's
// 'game.resync'/'game.none' handling). Normal in-game navigation already
// happens from within each screen and is untouched by this.
const PHASE_ROUTE: Partial<Record<GamePhase, string>> = {
  roster: '/roster',
  chat: '/table',
  guess: '/guess',
  reveal: '/reveal',
  result: '/result',
  failed: '/session-ended'
};

function Router() {
  const { state } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = !!state.player;

  useEffect(() => {
    const target = PHASE_ROUTE[state.phase];
    if (target && (location.pathname === '/home' || location.pathname === '/')) {
      navigate(target, { replace: true });
    }
  }, [state.phase, location.pathname, navigate]);

  // A Heart/Coin was already spent to enter this room — closing the tab or
  // hitting back mid-game forfeits the round the same as if the connection
  // just dropped, so warn before either. Native confirm/beforeunload rather
  // than a styled modal, matching the alert() Table.tsx already uses for
  // the equivalent "game cancelled" case.
  const liveGame = state.phase === 'roster' || state.phase === 'chat' || state.phase === 'guess';
  useEffect(() => {
    if (!liveGame) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    // Push a dummy history entry so the first back press is interceptable
    // instead of immediately navigating away.
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      const leave = window.confirm("Leave the game? You'll lose your spot and this round won't count in your favor.");
      if (!leave) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [liveGame]);

  return (
    <Routes>
      <Route path="/" element={loggedIn ? <Navigate to="/home" replace /> : <Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/home" element={loggedIn ? <Home /> : <Navigate to="/" replace />} />
      <Route path="/queue" element={loggedIn ? <Queue /> : <Navigate to="/" replace />} />
      <Route path="/roster" element={loggedIn ? <Roster /> : <Navigate to="/" replace />} />
      <Route path="/table" element={loggedIn ? <Table /> : <Navigate to="/" replace />} />
      <Route path="/guess" element={loggedIn ? <Guess /> : <Navigate to="/" replace />} />
      <Route path="/reveal" element={loggedIn ? <Reveal /> : <Navigate to="/" replace />} />
      <Route path="/result" element={loggedIn ? <Result /> : <Navigate to="/" replace />} />
      <Route path="/leaderboard" element={loggedIn ? <Leaderboard /> : <Navigate to="/" replace />} />
      {/* Public on purpose — Google's OAuth consent screen links to these, and
          people read them before deciding to sign up. */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/bot-test" element={<BotTest />} />
      <Route path="/session-ended" element={loggedIn ? <SessionEnded /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="app-shell">
        <Boot>
          <HashRouter>
            <Router />
          </HashRouter>
        </Boot>
      </div>
    </GameProvider>
  );
}
