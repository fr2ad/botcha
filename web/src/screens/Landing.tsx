import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 34, letterSpacing: 0.5 }}>BOTCHA</div>
      <div style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.5 }}>
        3 humans. 1 bot.
        <br />
        <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Find it.</span>
      </div>

      <button className="btn-primary" style={{ width: 220, marginTop: 8 }} onClick={() => navigate('/onboarding')}>
        Continue with Google
      </button>
      <div style={{ fontSize: 11, color: 'var(--text-6)' }}>(mocked for now — no real Google sign-in yet)</div>

      <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
        <Step icon="hgi-user-group" label="join a table" />
        <Step icon="hgi-message-01" label="chat 3 rounds" />
        <Step icon="hgi-search-01" label="guess the bot" />
      </div>
    </div>
  );
}

function Step({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-4)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`hgi-stroke ${icon}`} style={{ fontSize: 17, color: 'var(--accent)' }} />
      </div>
      {label}
    </div>
  );
}
