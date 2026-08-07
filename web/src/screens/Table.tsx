import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { CountdownRing } from '../components/CountdownRing';
import { SeatAvatar } from '../components/SeatAvatar';

const TURN_WINDOW_MS = 15_000;
const MAX_LEN = 200;
const POSITIONS: Array<{ top?: number | string; bottom?: number | string; left?: number | string; right?: number | string; transform: string }> = [
  { top: 0, transform: 'translateX(-50%)' },
  { top: '50%', right: 0, transform: 'translateY(-50%)' },
  { bottom: 0, transform: 'translateX(-50%)' },
  { top: '50%', left: 0, transform: 'translateY(-50%)' }
];

export function Table() {
  const navigate = useNavigate();
  const { state, sendTurnMessage } = useGame();
  const [draft, setDraft] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.phase === 'guess') navigate('/guess');
    if (state.phase === 'idle') navigate('/home');
    if (state.phase === 'cancelled') {
      alert(state.cancelReason === 'not_enough_players' ? 'Not enough players left — your heart was refunded.' : 'Game cancelled.');
      navigate('/home');
    }
  }, [state.phase, state.cancelReason, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages.length]);

  const seatByIndex = (i: number) => state.roster.find((s) => s.seatIndex === i);
  const isMyTurn = state.turnSeatIndex === state.mySeatIndex;

  function submit() {
    if (!draft.trim() || !isMyTurn) return;
    sendTurnMessage(draft.trim());
    setDraft('');
  }

  return (
    <div className="screen" style={{ paddingBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 12, letterSpacing: 2, color: 'var(--accent)' }}>BOTCHA</span>
        <span className="pill" style={{ fontSize: 11, color: 'var(--text-4)', border: '1px solid var(--border)', padding: '5px 12px' }}>
          Round <b style={{ color: 'var(--text-1)' }}>{state.round}</b> / 3
        </span>
      </div>

      <div style={{ position: 'relative', height: 220, margin: '4px 0 16px' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'var(--pill-bg)',
            border: '1px solid var(--border)'
          }}
        />
        {state.roster.map((seat, i) => {
          const pos = POSITIONS[i] ?? POSITIONS[0];
          const active = state.turnSeatIndex === seat.seatIndex;
          const silent = state.silentSeats.includes(seat.seatIndex);
          return (
            <div
              key={seat.seatIndex}
              style={{
                position: 'absolute',
                ...pos,
                textAlign: 'center',
                width: 88,
                background: active ? 'var(--accent-soft)' : 'transparent',
                borderRadius: 14,
                padding: 6
              }}
            >
              {active && state.turnDeadline ? (
                <div style={{ margin: '0 auto 4px', width: 46 }}>
                  <CountdownRing deadline={state.turnDeadline} totalMs={TURN_WINDOW_MS} size={46} />
                </div>
              ) : (
                <div style={{ margin: '0 auto 4px', width: 44 }}>
                  <SeatAvatar letter={seat.avatar} color={seat.color} size={44} />
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                {seat.codeName}
                {seat.seatIndex === state.mySeatIndex ? ' (you)' : ''}
              </div>
              {silent && (
                <div style={{ fontSize: 8, color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 8, padding: '1px 6px', marginTop: 2, display: 'inline-block' }}>
                  SILENT
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--pill-bg)', borderRadius: 16, padding: 12, flex: 1, overflowY: 'auto', minHeight: 160, maxHeight: 220 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--text-5)', marginBottom: 8 }}>TABLE LOG</div>
        {state.messages.map((m, i) => {
          const seat = seatByIndex(m.seatIndex);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ flexShrink: 0 }}>
                <SeatAvatar letter={seat?.avatar ?? '?'} color={seat?.color ?? '#333'} size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{seat?.codeName}</div>
                <div style={{ fontSize: 12.5, color: '#cfd2e0' }}>{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: isMyTurn ? 'rgba(124,92,255,.1)' : 'var(--pill-bg)',
          border: `1px solid ${isMyTurn ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14,
          padding: '10px 12px'
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={isMyTurn ? 'Say something before time runs out…' : 'Wait for your turn…'}
          disabled={!isMyTurn}
          maxLength={MAX_LEN}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13 }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-5)' }}>{MAX_LEN - draft.length}</span>
        <button
          onClick={submit}
          disabled={!isMyTurn || !draft.trim()}
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isMyTurn && draft.trim() ? 1 : 0.5
          }}
          aria-label="Send"
        >
          <i className="hgi-stroke hgi-sent" style={{ fontSize: 14 }} />
        </button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-6)', marginTop: 10 }}>
        ONE OF THESE FOUR IS NOT HUMAN
      </div>
    </div>
  );
}
