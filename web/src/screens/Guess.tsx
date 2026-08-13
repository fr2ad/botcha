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
  const candidates = state.roster.filter((s) => s.seatIndex !== state.mySeatIndex);

  return (
    <div className="screen" style={{ alignItems: 'center' }}>
      <div style={{ padding: '28px 0 6px', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 22 }}>
        Who's the bot?
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>3 rounds of chat. One shot.</div>

      <div style={{ margin: '24px 0 28px' }}>
        {state.guessDeadline && (
          <CountdownRing deadline={state.guessDeadline} totalMs={GUESS_WINDOW_MS} size={116} label="TO VOTE" />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {candidates.map((seat, i) => {
          const selected = state.myGuess === seat.seatIndex;
          return (
            <button
              key={seat.seatIndex}
              onClick={() => !locked && submitGuess(seat.seatIndex)}
              disabled={locked}
              className="rise"
              style={{
                ['--i' as string]: i,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                background: selected ? 'rgba(124,110,246,.12)' : 'var(--panel)',
                border: selected ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,.08)',
                boxShadow: selected ? '0 0 26px rgba(124,110,246,.4)' : undefined,
                borderRadius: 18,
                padding: '14px 16px',
                color: 'var(--text-1)',
                opacity: locked && !selected ? 0.55 : 1,
                cursor: locked ? 'default' : 'pointer',
                transition: 'opacity .25s ease, box-shadow .25s ease, background .25s ease'
              }}
            >
              <SeatAvatar codeName={seat.codeName} color={seat.color} size={46} />
              <span style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, display: 'block' }}>
                  {seat.codeName}
                </span>
                {selected && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--accent-2)',
                      fontWeight: 800,
                      letterSpacing: 1,
                      marginTop: 2,
                      display: 'block'
                    }}
                  >
                    LOCKED IN
                  </span>
                )}
              </span>
              {selected && (
                <i className="hgi-stroke hgi-checkmark-circle-02 pop" style={{ fontSize: 22, color: 'var(--accent-2)' }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: state.votedTotal }, (_, i) => (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: i < state.votedCount ? 'var(--accent)' : 'rgba(255,255,255,.14)',
                boxShadow: i < state.votedCount ? '0 0 8px rgba(124,110,246,.7)' : undefined,
                transition: 'background .3s ease, box-shadow .3s ease'
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {state.votedCount} of {state.votedTotal} voted
        </div>
      </div>
    </div>
  );
}
