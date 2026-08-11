import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

export function Queue() {
  const navigate = useNavigate();
  const { state, leaveQueue } = useGame();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.phase === 'roster') navigate('/roster');
  }, [state.phase, navigate]);

  useEffect(() => {
    if (state.queueBlocked) {
      alert('You need a heart or 25 coins to queue up. Come back tomorrow, or coins are on the way in a later update.');
      navigate('/home');
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
    <div className="screen" style={{ paddingBottom: 22 }}>
      <div className="topnav">
        <button className="icon-btn back" onClick={cancel} aria-label="Cancel">
          <i className="hgi-stroke hgi-cancel-01" />
        </button>
        <span className="pill" style={{ border: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 700, fontSize: 11, padding: '5px 14px' }}>
          FINDING HUMANS…
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2, textAlign: 'center' }}>
        {state.onlineCount} players online
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#2a2c46', boxShadow: '0 0 0 3px var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            {state.player?.avatar}
          </div>
          <span style={{ fontSize: 9 }}>you</span>
        </div>
        {slots.map((filled, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                border: filled ? 'none' : '2px dashed #35374a',
                background: filled ? '#2a2c46' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#35374a',
                fontWeight: 800
              }}
            >
              {filled ? '✓' : '?'}
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-6)' }}>{filled ? 'ready' : '…'}</span>
          </div>
        ))}
      </div>

      <button className="btn-outline" onClick={copyInvite}>
        <i className="hgi-stroke hgi-link-01" style={{ fontSize: 14 }} />
        {copied ? 'Link copied' : 'Copy invite link'}
      </button>
      <div style={{ fontSize: 9.5, color: 'var(--text-6)', marginTop: 10, textAlign: 'center' }}>
        free to wait — hearts not spent yet
      </div>
    </div>
  );
}
