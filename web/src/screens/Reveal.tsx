import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { SeatAvatar } from '../components/SeatAvatar';

export function Reveal() {
  const navigate = useNavigate();
  const { state } = useGame();

  useEffect(() => {
    if (state.phase === 'result') navigate('/result');
    if (state.phase === 'idle') navigate('/home');
  }, [state.phase, navigate]);

  const reveal = state.reveal;
  if (!reveal) return <div className="screen" />;

  const botIdentity = reveal.identities.find((i) => i.isBot);
  const botSeat = state.roster.find((s) => s.seatIndex === reveal.botSeatIndex);

  return (
    <div className="screen" style={{ alignItems: 'center' }}>
      <div style={{ paddingTop: 26, fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, color: 'var(--text-2)' }}>
        The bot was…
      </div>

      <div
        style={{
          width: 108,
          height: 108,
          borderRadius: '50%',
          background: 'var(--green)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '18px 0 10px'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,30,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="hgi-stroke hgi-robot-01" style={{ fontSize: 44, color: '#fff' }} />
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 18 }}>{botSeat?.codeName}</div>
      <div style={{ border: '1px solid var(--border)', color: 'var(--text-5)', borderRadius: 999, padding: '5px 12px', fontSize: 9.5, marginTop: 6 }}>
        was really "{botIdentity?.nickname}"
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {reveal.guesses.map((g) => {
          const seat = state.roster.find((s) => s.seatIndex === g.seatIndex);
          if (!seat) return null;
          const correct = g.guessSeatIndex === reveal.botSeatIndex;
          return (
            <div key={g.seatIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <SeatAvatar letter={seat.avatar} color={seat.color} size={42} ring={seat.seatIndex === state.mySeatIndex} />
              <span style={{ fontSize: 9 }}>{seat.seatIndex === state.mySeatIndex ? 'You' : seat.nickname}</span>
              <i
                className={`hgi-stroke ${g.guessSeatIndex === null ? 'hgi-cancel-circle' : correct ? 'hgi-checkmark-circle-02' : 'hgi-cancel-circle'}`}
                style={{ fontSize: 12, color: g.guessSeatIndex === null ? 'var(--text-6)' : correct ? 'var(--green)' : 'var(--pink)' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
