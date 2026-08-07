import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

export function Home() {
  const navigate = useNavigate();
  const { state, joinQueue } = useGame();
  const player = state.player;

  if (!player) {
    navigate('/');
    return null;
  }

  const canPlayFree = player.hearts_remaining > 0;

  function handlePlay() {
    joinQueue();
    navigate('/queue');
  }

  return (
    <div className="screen" style={{ paddingBottom: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 22 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="pill" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--pill-bg)', padding: '5px 10px', fontSize: 11, fontWeight: 700 }}>
            <i className="hgi-stroke hgi-favourite" style={{ color: 'var(--accent)', fontSize: 13 }} />
            {player.hearts_remaining}/5
          </span>
          <span className="pill" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--pill-bg)', padding: '5px 10px', fontSize: 11, fontWeight: 700 }}>
            <i className="hgi-stroke hgi-coins-01" style={{ color: 'var(--amber)', fontSize: 13 }} />
            {player.coins}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-5)' }}>{player.nickname} {player.avatar}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <button
          onClick={handlePlay}
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'var(--accent)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            fontSize: 20,
            color: '#fff',
            boxShadow: '0 0 40px rgba(124,92,255,.55)'
          }}
        >
          {canPlayFree ? 'Play' : `Play (${25} coins)`}
        </button>
        {!canPlayFree && <div style={{ fontSize: 10, color: 'var(--text-6)' }}>hearts refill tomorrow</div>}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button className="btn-outline" style={{ flex: 1 }} onClick={() => navigate('/leaderboard')}>
          <i className="hgi-stroke hgi-medal-01" style={{ fontSize: 14 }} />
          Leaderboard
        </button>
        <button className="btn-outline" style={{ flex: 1 }} onClick={() => alert('3 rounds of turn-based chat, then guess the bot. That\'s it!')}>
          <i className="hgi-stroke hgi-book-01" style={{ fontSize: 14 }} />
          How to play
        </button>
      </div>
    </div>
  );
}
