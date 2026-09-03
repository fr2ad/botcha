import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { AVATAR_POOL, Orb } from '../components/Orb';

export function Queue() {
  const navigate = useNavigate();
  const { state, leaveQueue } = useGame();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.phase === 'roster') navigate('/roster', { replace: true });
  }, [state.phase, navigate]);

  useEffect(() => {
    if (state.queueBlocked) {
      alert('You need a heart or 25 coins to queue up. Come back tomorrow when hearts refill.');
      navigate('/home', { replace: true });
    }
  }, [state.queueBlocked, navigate]);

  function copyInvite() {
    navigator.clipboard?.writeText(window.location.origin).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function cancel() {
    leaveQueue();
    navigate('/home');
  }

  const slots = Array.from({ length: 3 }, (_, i) => i < state.queueSize - 1);

  return (
    <div className="screen">
      <div className="topnav">
        <button className="icon-btn back" onClick={cancel} aria-label="Cancel">
          <i className="hgi-stroke hgi-cancel-01" style={{ fontSize: 15 }} />
        </button>
        <span
          style={{
            margin: '0 auto',
            border: '1px solid rgba(124,110,246,.4)',
            color: 'var(--text-2)',
            fontWeight: 800,
            fontSize: 11.5,
            letterSpacing: 1.5,
            padding: '8px 18px',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          FINDING HUMANS
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {[0, 0.2, 0.4].map((d) => (
              <span
                key={d}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: `blink 1.2s ease ${d}s infinite`
                }}
              />
            ))}
          </span>
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          fontSize: 11,
          color: 'var(--text-3)',
          marginTop: 8
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 8px rgba(56,217,122,.8)'
          }}
        />
        {state.onlineCount} online
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ borderRadius: '50%', animation: 'ringPulse 2.4s ease-out infinite' }}>
            <Orb avatar={state.player?.avatar ?? AVATAR_POOL[0]} size={62} ring="var(--accent)" />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700 }}>you</span>
        </div>

        {slots.map((filled, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {filled ? (
              <div
                className="pop"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1px solid rgba(255,255,255,.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="hgi-stroke hgi-checkmark-circle-02" style={{ fontSize: 22, color: 'var(--green)' }} />
              </div>
            ) : (
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  border: '2px dashed rgba(255,255,255,.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-5)',
                  fontFamily: 'var(--font-head)',
                  fontWeight: 600,
                  fontSize: 20,
                  animation: `dashPulse 2s ease-in-out ${i * 0.5}s infinite`
                }}
              >
                ?
              </div>
            )}
            <span style={{ fontSize: 10.5, color: filled ? 'var(--text-3)' : 'var(--text-5)' }}>
              {filled ? 'ready' : '…'}
            </span>
          </div>
        ))}
      </div>

      <button className="btn-outline" onClick={copyInvite}>
        <i className="hgi-stroke hgi-link-01" style={{ fontSize: 15 }} />
        {copied ? 'Link copied' : 'Copy invite link'}
      </button>
      <div style={{ fontSize: 10.5, color: 'var(--text-5)', marginTop: 12, textAlign: 'center' }}>
        free to wait — hearts aren't spent yet
      </div>
    </div>
  );
}
