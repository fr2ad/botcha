import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { CountdownRing } from '../components/CountdownRing';
import { SeatAvatar } from '../components/SeatAvatar';

const GUESS_WINDOW_MS = 20_000;

export function Guess() {
  const navigate = useNavigate();
  const { state, submitGuess } = useGame();

  useEffect(() => {
    if (state.phase === 'reveal') navigate('/reveal');
    if (state.phase === 'idle') navigate('/home');
  }, [state.phase, navigate]);

  const locked = state.myGuess !== null;

  return (
    <div className="screen" style={{ alignItems: 'center', paddingBottom: 20 }}>
      <div className="topnav">
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 16 }}>Who's the bot?</span>
      </div>

      {state.guessDeadline && (
        <div style={{ margin: '14px 0' }}>
          <CountdownRing deadline={state.guessDeadline} totalMs={GUESS_WINDOW_MS} size={110} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
        {state.roster
          .filter((s) => s.seatIndex !== state.mySeatIndex)
          .map((seat) => {
            const selected = state.myGuess === seat.seatIndex;
            return (
              <button
                key={seat.seatIndex}
                onClick={() => !locked && submitGuess(seat.seatIndex)}
                style={{
                  background: 'var(--pill-bg)',
                  border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: selected ? '0 0 14px rgba(124,92,255,.5)' : undefined,
                  borderRadius: 14,
                  padding: 12,
                  textAlign: 'center',
                  color: 'var(--text-1)',
                  cursor: locked ? 'default' : 'pointer',
                  opacity: locked && !selected ? 0.6 : 1
                }}
              >
                <div style={{ margin: '0 auto 4px', width: 38 }}>
                  <SeatAvatar letter={seat.avatar} color={seat.color} size={38} />
                </div>
                {seat.codeName}
                {selected && <div style={{ fontSize: 8.5, color: '#a89bff', marginTop: 2 }}>locked in</div>}
              </button>
            );
          })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 14, fontSize: 10, color: 'var(--text-6)' }}>
        {state.votedCount} of {state.votedTotal} players have voted
      </div>
    </div>
  );
}
