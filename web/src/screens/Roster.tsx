import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { Ambient } from '../components/Ambient';
import { SeatAvatar } from '../components/SeatAvatar';

export function Roster() {
  const navigate = useNavigate();
  const { state } = useGame();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (state.phase === 'chat') navigate('/table');
    if (state.phase === 'idle') navigate('/home');
  }, [state.phase, navigate]);

  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.max(1, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Real nicknames are listed unordered on purpose: the spec shows who is in the
  // room without revealing which Seat is which (docs/SPEC.md §2).
  const nicknames = state.roster.map((s) => `${s.avatar} ${s.nickname}`).sort();

  return (
    <div className="screen" style={{ alignItems: 'center' }}>
      <Ambient washTop={-100} />

      <div style={{ padding: '30px 0 8px' }}>
        <span
          style={{
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 1.5,
            padding: '8px 20px',
            borderRadius: 999,
            boxShadow: '0 0 22px rgba(124,110,246,.5)'
          }}
        >
          STARTING IN {count}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '10px 0 22px' }}>
        Your table identity for the next 3 rounds
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
        {state.roster.map((seat, i) => {
          const isYou = seat.seatIndex === state.mySeatIndex;
          return (
            <div
              key={seat.seatIndex}
              className="pop"
              style={{
                ['--i' as string]: i,
                background: 'var(--panel)',
                border: `1px solid ${isYou ? 'rgba(124,110,246,.45)' : 'rgba(255,255,255,.07)'}`,
                boxShadow: isYou ? '0 0 24px rgba(124,110,246,.2)' : undefined,
                borderRadius: 20,
                padding: '20px 14px',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <SeatAvatar codeName={seat.codeName} color={seat.color} size={56} ringWidth={3} glow />
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15 }}>{seat.codeName}</div>
              {isYou ? (
                <div
                  style={{
                    marginTop: 5,
                    display: 'inline-block',
                    background: 'rgba(124,110,246,.18)',
                    color: 'var(--accent-2)',
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '2px 10px',
                    borderRadius: 999
                  }}
                >
                  YOU
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 4 }}>identity hidden</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {nicknames.map((n, i) => (
          <span
            key={n}
            className="rise"
            style={{
              ['--i' as string]: i + 4,
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 999,
              padding: '4px 11px',
              fontSize: 10.5,
              color: 'var(--text-3)'
            }}
          >
            {n}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          fontSize: 12,
          color: 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <i className="hgi-stroke hgi-bot" style={{ fontSize: 15, color: 'var(--accent-2)' }} />
        one of these four is not human…
      </div>
    </div>
  );
}
