import { useState } from 'react';
import { Confetti } from '../components/Ambient';

// Debug-only page: fire the real Result-screen confetti burst on demand,
// no game/guess required. Not linked from anywhere in the game UI — visit
// /#/confetti-test. Reuses the actual <Confetti/> component and index.css
// keyframe, not a re-implementation, so this always matches what Result
// really shows.
export function ConfettiTest() {
  const [runId, setRunId] = useState(0);

  return (
    <div className="screen" style={{ alignItems: 'center' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -100,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          height: 420,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(56,217,122,.12), transparent 65%)'
        }}
      />
      <Confetti key={runId} />

      <div
        style={{
          paddingTop: 40,
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: 26,
          textAlign: 'center',
          color: 'var(--green)',
          textShadow: '0 0 24px rgba(56,217,122,.4)'
        }}
      >
        You caught the bot!
      </div>

      <button className="btn-primary" style={{ marginTop: 32, width: 'auto', padding: '12px 28px' }} onClick={() => setRunId((n) => n + 1)}>
        Fire confetti
      </button>
    </div>
  );
}
