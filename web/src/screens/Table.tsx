import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { ChatTranscript } from '../components/ChatTranscript';
import { CountdownRing } from '../components/CountdownRing';
import { SeatAvatar } from '../components/SeatAvatar';
import { Wordmark } from '../components/Wordmark';

const TURN_WINDOW_MS = 20_000;
const MAX_LEN = 200;
const TOTAL_ROUNDS = 3;

function mentionToken(codeName: string) {
  return '@' + codeName.replace(/\s+/g, '');
}

export function Table() {
  const navigate = useNavigate();
  const { state, sendTurnMessage } = useGame();
  const [draft, setDraft] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.phase === 'guess') navigate('/guess');
    if (state.phase === 'idle') navigate('/home');
    if (state.phase === 'cancelled') {
      alert(
        state.cancelReason === 'not_enough_players'
          ? 'Not enough players left — your heart was refunded.'
          : 'Game cancelled.'
      );
      navigate('/home');
    }
  }, [state.phase, state.cancelReason, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages.length]);

  const isMyTurn = state.turnSeatIndex === state.mySeatIndex;

  function submit() {
    if (!draft.trim() || !isMyTurn) return;
    sendTurnMessage(draft.trim());
    setDraft('');
  }

  function mention(codeName: string) {
    if (!isMyTurn) return;
    setDraft((d) => (d.trim() ? `${d.trim()} ${mentionToken(codeName)} ` : `${mentionToken(codeName)} `));
    inputRef.current?.focus();
  }

  return (
    <div
      className="screen"
      style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 14px' }}>
        <span style={{ color: 'var(--accent-2)' }}>
          <Wordmark size={14} />
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11.5,
            color: 'var(--text-3)',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '6px 14px',
            borderRadius: 999
          }}
        >
          Round <b style={{ color: 'var(--text-1)' }}>{state.round}</b> / {TOTAL_ROUNDS}
          <span style={{ display: 'inline-flex', gap: 4 }}>
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i < state.round ? 'var(--accent)' : 'rgba(255,255,255,.15)'
                }}
              />
            ))}
          </span>
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0 14px' }}>
        {state.roster.map((seat) => {
          const active = state.turnSeatIndex === seat.seatIndex;
          const silent = state.silentSeats.includes(seat.seatIndex);
          const isYou = seat.seatIndex === state.mySeatIndex;
          return (
            <div
              key={seat.seatIndex}
              onClick={() => mention(seat.codeName)}
              title={isMyTurn ? `Mention ${seat.codeName} — doesn't force a reply` : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                // Equal shares, not a fixed width: 4 x 92px overflowed a 375px
                // phone and got clipped by .screen's overflow:hidden. flex:1
                // still never reflows on the ring swap, which was the reason
                // the width was pinned in the first place.
                flex: 1,
                minWidth: 0,
                cursor: isMyTurn ? 'pointer' : 'default'
              }}
            >
              {active && state.turnDeadline ? (
                <CountdownRing deadline={state.turnDeadline} totalMs={TURN_WINDOW_MS} size={64} color={seat.color} />
              ) : (
                <SeatAvatar codeName={seat.codeName} color={seat.color} size={50} />
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  textAlign: 'center'
                }}
              >
                {seat.codeName}
                {isYou && <span style={{ color: 'var(--accent-2)' }}> (you)</span>}
              </span>
              {active && (
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: seat.color,
                    background: `color-mix(in oklab, ${seat.color} 14%, transparent)`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap'
                  }}
                >
                  SPEAKING
                </span>
              )}
              {silent && !active && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: 'var(--amber)',
                    border: '1px solid rgba(255,207,61,.5)',
                    padding: '1px 7px',
                    borderRadius: 999
                  }}
                >
                  SILENT
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: 'var(--log)',
          border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 20,
          padding: 16,
          flex: 1,
          minHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-5)', fontWeight: 800 }}>TABLE LOG</div>
        <ChatTranscript
          messages={state.messages}
          roster={state.roster}
          mySeatIndex={state.mySeatIndex}
          emptyText="Nobody's spoken yet. First turn is starting…"
        />
        <div ref={chatEndRef} />
      </div>

      {/* A real <form> is what makes Enter send: it gives mobile keyboards a
          Send key (enterKeyHint) and submits natively, where a keydown handler
          alone is swallowed on most virtual keyboards. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: isMyTurn ? 'rgba(124,110,246,.12)' : 'var(--log)',
          border: `1px solid ${isMyTurn ? 'var(--accent)' : 'rgba(255,255,255,.08)'}`,
          borderRadius: 999,
          padding: '12px 16px',
          opacity: isMyTurn ? 1 : 0.7,
          transition: 'background .2s ease, border-color .2s ease, opacity .2s ease'
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder={isMyTurn ? 'Say something before time runs out…' : 'Wait for your turn…'}
          disabled={!isMyTurn}
          maxLength={MAX_LEN}
          enterKeyHint="send"
          autoComplete="off"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-1)',
            // 16px exactly: iOS Safari zooms the whole page in on focus below
            // that, which is what broke the layout width on phones.
            fontSize: 16
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-5)' }}>{MAX_LEN - draft.length}</span>
        <button
          type="submit"
          disabled={!isMyTurn || !draft.trim()}
          aria-label="Send"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            flexShrink: 0,
            background: isMyTurn && draft.trim() ? 'var(--accent)' : 'rgba(124,110,246,.25)',
            color: isMyTurn && draft.trim() ? '#fff' : 'rgba(255,255,255,.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="hgi-stroke hgi-sent" style={{ fontSize: 14 }} />
        </button>
      </form>

      <div
        style={{
          textAlign: 'center',
          fontSize: 9.5,
          letterSpacing: 2,
          color: 'var(--text-5)',
          marginTop: 12,
          fontWeight: 800
        }}
      >
        1–3 OF YOUR OPPONENTS MAY BE BOTS
      </div>
    </div>
  );
}
