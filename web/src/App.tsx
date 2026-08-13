import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
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
      <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>3 humans. 1 bot. Find it.</div>

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
  const { resumeSession } = useGame();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    resumeSession().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <Splash />;
  return <>{children}</>;
}

function Router() {
  const { state } = useGame();
  const loggedIn = !!state.player;

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
      <Route path="/bot-test" element={<BotTest />} />
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
