import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard } from '../api';
import { useGame } from '../GameContext';
import { Orb } from '../components/Orb';
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
  const iAmInTop = !!players?.some((p) => p.id === myId);

  return (
    <div className="screen">
      <div className="topnav">
        <button className="icon-btn back" onClick={() => navigate(-1)} aria-label="Back">
          <i className="hgi-stroke hgi-arrow-left-01" />
        </button>
        <span className="title">Top Catchers</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
        {players === null && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, paddingTop: 20 }}>Loading…</div>
        )}
        {players?.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, paddingTop: 20 }}>
            Nobody's played yet — be the first.
          </div>
        )}

        {players?.map((p, i) => (
          <Row
            key={p.id}
            index={i}
            rank={i + 1}
            avatar={p.avatar}
            name={p.id === myId ? 'You' : p.nickname}
            score={p.score}
            isMe={p.id === myId}
          />
        ))}

        {players && !iAmInTop && state.player && (
          <Row
            index={players.length}
            rank={state.player.rank}
            avatar={state.player.avatar}
            name="You"
            score={state.player.score}
            isMe
          />
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-5)' }}>
        resets never — all-time catches
      </div>
    </div>
  );
}

type RowProps = {
  index: number;
  rank: number;
  avatar: string;
  name: string;
  score: number;
  isMe: boolean;
};

function Row({ index, rank, avatar, name, score, isMe }: RowProps) {
  const gold = rank === 1;

  return (
    <div
      className="rise"
      style={{
        ['--i' as string]: index,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        padding: '12px 14px',
        background: isMe
          ? 'rgba(124,110,246,.14)'
          : gold
            ? 'linear-gradient(90deg, rgba(255,207,61,.1), var(--panel) 60%)'
            : 'var(--panel)',
        border: `1px solid ${isMe ? 'var(--accent)' : gold ? 'rgba(255,207,61,.3)' : 'transparent'}`,
        boxShadow: isMe ? '0 0 22px rgba(124,110,246,.3)' : undefined
      }}
    >
      <span
        style={{
          width: 24,
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: 14,
          color: gold ? 'var(--amber)' : isMe ? 'var(--accent-2)' : 'var(--text-2)'
        }}
      >
        {rank}
      </span>
      <Orb avatar={avatar} size={38} ring={gold ? 'var(--amber)' : isMe ? 'var(--accent)' : undefined} />
      <span style={{ fontSize: 13, flex: 1, fontWeight: isMe || gold ? 800 : 400 }}>{name}</span>
      {gold && <i className="hgi-stroke hgi-medal-01" style={{ fontSize: 15, color: 'var(--amber)' }} />}
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: gold ? 'var(--amber)' : isMe ? 'var(--accent-2)' : 'var(--text-3)'
        }}
      >
        {score}
      </span>
    </div>
  );
}
