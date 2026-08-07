import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { SeatAvatar } from '../components/SeatAvatar';

export function Roster() {
  const navigate = useNavigate();
  const { state } = useGame();

  useEffect(() => {
    if (state.phase === 'chat') navigate('/table');
    if (state.phase === 'idle') navigate('/home');
  }, [state.phase, navigate]);

  return (
    <div className="screen" style={{ alignItems: 'center' }}>
      <div style={{ padding: '22px 0 18px' }}>
        <span style={{ background: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 11, padding: '5px 14px', borderRadius: 999 }}>
          STARTING IN 3
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
        {state.roster.map((seat) => (
          <div key={seat.seatIndex} style={{ background: 'var(--pill-bg)', borderRadius: 16, padding: 14, textAlign: 'center' }}>
            <div style={{ margin: '0 auto 6px', width: 44 }}>
              <SeatAvatar letter={seat.avatar} color={seat.color} />
            </div>
            {seat.codeName}
            <div style={{ fontSize: 9.5, color: 'var(--text-5)' }}>
              {seat.nickname} {seat.seatIndex === state.mySeatIndex ? '(you)' : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: 10.5, color: 'var(--text-5)', textAlign: 'center' }}>
        one of these four is not human…
      </div>
    </div>
  );
}
