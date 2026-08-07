import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard } from '../api';
import { useGame } from '../GameContext';
import type { LeaderboardEntry } from '../types';

export function Leaderboard() {
  const navigate = useNavigate();
  const { state } = useGame();
  const [players, setPlayers] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then((r) => setPlayers(r.players))
      .catch(() => setPlayers([]));
  }, []);

  const myId = state.player?.id;
  const myRank = players?.findIndex((p) => p.id === myId);
  const iAmInTop = myRank !== undefined && myRank !== -1;

  return (
    <div className="screen" style={{ paddingBottom: 18 }}>
      <div className="topnav">
        <button className="icon-btn back" onClick={() => navigate(-1)} aria-label="Back">
          <i className="hgi-stroke hgi-arrow-left-01" />
        </button>
        <span className="title">Top Catchers</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {players === null && <div style={{ textAlign: 'center', color: 'var(--text-5)', fontSize: 12 }}>Loading…</div>}
        {players?.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-5)', fontSize: 12 }}>Nobody's played yet — be the first.</div>}
        {players?.map((p, i) => {
          const isMe = p.id === myId;
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isMe ? 'rgba(124,92,255,.16)' : 'var(--pill-bg)',
                border: isMe ? '1px solid var(--accent)' : 'none',
                borderRadius: 12,
                padding: '8px 10px'
              }}
            >
              <span style={{ width: 20, fontWeight: 800, fontSize: 11, color: i === 0 ? 'var(--amber)' : 'var(--text-4)' }}>{i + 1}</span>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2c46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                {p.avatar}
              </div>
              <span style={{ fontSize: 12, flex: 1, fontWeight: isMe ? 700 : 400 }}>{isMe ? 'You' : p.nickname}</span>
              <span style={{ fontSize: 11, color: isMe ? '#a89bff' : 'var(--text-5)' }}>{p.score}</span>
            </div>
          );
        })}
        {players && !iAmInTop && state.player && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,92,255,.16)', border: '1px solid var(--accent)', borderRadius: 12, padding: '8px 10px' }}>
            <span style={{ width: 20, fontWeight: 800, fontSize: 11, color: '#a89bff' }}>{state.player.rank}</span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2c46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
              {state.player.avatar}
            </div>
            <span style={{ fontSize: 12, flex: 1, fontWeight: 700 }}>You</span>
            <span style={{ fontSize: 11, color: '#a89bff' }}>{state.player.score}</span>
          </div>
        )}
      </div>
    </div>
  );
}
