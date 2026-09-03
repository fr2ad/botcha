import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { Confetti } from '../components/Ambient';
import { SeatAvatar } from '../components/SeatAvatar';

export function Reveal() {
  const navigate = useNavigate();
  const { state } = useGame();

  useEffect(() => {
    if (state.phase === 'result') navigate('/result', { replace: true });
    if (state.phase === 'idle') navigate('/home', { replace: true });
  }, [state.phase, navigate]);

  const reveal = state.reveal;
  if (!reveal) return <div className="screen" />;

  const botSeats = reveal.botSeatIndexes
    .map((seatIndex) => {
      const seat = state.roster.find((s) => s.seatIndex === seatIndex);
      const identity = reveal.identities.find((id) => id.seatIndex === seatIndex);
      return seat && identity ? { seat, identity } : null;
    })
    .filter((b): b is NonNullable<typeof b> => !!b);
  const myGuess = reveal.guesses.find((g) => g.seatIndex === state.mySeatIndex);
  const iWasRight = myGuess?.guessSeatIndex != null && reveal.botSeatIndexes.includes(myGuess.guessSeatIndex);
  const solo = botSeats.length === 1;
  const botColor = solo ? botSeats[0].seat.color : 'var(--pink)';

  return (
    <div className="screen" style={{ alignItems: 'center', background: 'var(--bg-0)' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 340,
          height: 520,
          background: 'radial-gradient(ellipse 50% 60% at 50% 20%, rgba(124,110,246,.28), transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      {iWasRight && <Confetti />}

      <div
        style={{
          paddingTop: 56,
          fontFamily: 'var(--font-head)',
          fontWeight: 600,
          fontSize: 17,
          color: 'var(--text-2)',
          letterSpacing: 1
        }}
      >
        {solo ? 'The bot was…' : `${botSeats.length} bots were…`}
      </div>

      {solo ? (
        <>
          <div className="pop" style={{ margin: '26px 0 16px', position: 'relative' }}>
            <div
              style={{
                width: 128,
                height: 128,
                borderRadius: '50%',
                background: 'var(--surface)',
                boxShadow: `0 0 0 4px ${botColor}, 0 0 60px color-mix(in oklab, ${botColor} 50%, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="hgi-stroke hgi-bot" style={{ fontSize: 54, color: botColor }} />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 18px rgba(124,110,246,.6)'
              }}
            >
              <i className="hgi-stroke hgi-search-01" style={{ fontSize: 16, color: '#fff' }} />
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 28 }}>
            {botSeats[0].seat.codeName}
          </div>
          <div
            style={{
              marginTop: 10,
              border: '1px solid rgba(255,255,255,.12)',
              color: 'var(--text-3)',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 11
            }}
          >
            was really <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>"{botSeats[0].identity.nickname}"</span>{' '}
            · a language model
          </div>
        </>
      ) : (
        <div className="pop" style={{ margin: '26px 0 16px', display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {botSeats.map(({ seat, identity }) => (
            <div key={seat.seatIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  boxShadow: `0 0 0 3px ${seat.color}, 0 0 32px color-mix(in oklab, ${seat.color} 50%, transparent)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="hgi-stroke hgi-bot" style={{ fontSize: 34, color: seat.color }} />
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15 }}>{seat.codeName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', maxWidth: 100, textAlign: 'center' }}>
                "{identity.nickname}"
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 44, fontSize: 10, letterSpacing: 2, color: 'var(--text-5)', fontWeight: 800 }}>
        WHO GUESSED WHAT
      </div>
      <div style={{ display: 'flex', gap: 26, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {reveal.guesses.map((g, i) => {
          const seat = state.roster.find((s) => s.seatIndex === g.seatIndex);
          if (!seat) return null;
          const isMe = g.seatIndex === state.mySeatIndex;
          const correct = g.guessSeatIndex != null && reveal.botSeatIndexes.includes(g.guessSeatIndex);
          const pickedSeat = state.roster.find((s) => s.seatIndex === g.guessSeatIndex);
          return (
            <div
              key={g.seatIndex}
              className="rise"
              style={{
                ['--i' as string]: i + 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6
              }}
            >
              <SeatAvatar codeName={seat.codeName} color={seat.color} size={50} glow={isMe} />
              <span style={{ fontSize: 10.5, fontWeight: isMe ? 800 : 400, color: isMe ? 'var(--text-1)' : 'var(--text-3)' }}>
                {isMe ? 'You' : seat.codeName}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: correct ? 'var(--green)' : 'var(--pink)'
                }}
              >
                <i
                  className={`hgi-stroke ${correct ? 'hgi-checkmark-circle-02' : 'hgi-cancel-circle'}`}
                  style={{ fontSize: 13 }}
                />
                {correct
                  ? 'caught it'
                  : g.guessSeatIndex === null
                    ? 'no guess'
                    : `picked ${pickedSeat?.codeName.split(' ')[1] ?? '?'}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
