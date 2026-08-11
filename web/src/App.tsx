import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GameProvider, useGame } from './GameContext';
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

function Boot({ children }: { children: React.ReactNode }) {
  const { resumeSession } = useGame();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    resumeSession().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <div className="screen" />;
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
