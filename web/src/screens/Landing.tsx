import { useNavigate } from 'react-router-dom';
import { Ambient } from '../components/Ambient';
import { Wordmark } from '../components/Wordmark';

const STEPS = [
  { icon: 'hgi-user-group', label: 'join a table' },
  { icon: 'hgi-message-01', label: 'chat 3 rounds' },
  { icon: 'hgi-search-01', label: 'guess the bot' }
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Ambient />

      <Wordmark size={46} />

      <div style={{ marginTop: 14, fontSize: 16, color: 'var(--text-2)', lineHeight: 1.5 }}>
        3 humans. 1 bot.
        <br />
        <span style={{ color: 'var(--accent-2)', fontWeight: 800 }}>Find it.</span>
      </div>

      <button className="btn-primary pulse" style={{ width: 260, marginTop: 34 }} onClick={() => navigate('/onboarding')}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            color: 'var(--accent-deep)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            fontSize: 13
          }}
        >
          G
        </span>
        Continue with Google
      </button>
      <div style={{ marginTop: 12, fontSize: 10.5, color: 'var(--text-5)' }}>
        mocked for now — one tap and you're in
      </div>

      <div style={{ display: 'flex', gap: 26, marginTop: 52 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className="rise"
            style={{
              ['--i' as string]: i + 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              fontSize: 10.5,
              color: 'var(--text-3)'
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className={`hgi-stroke ${s.icon}`} style={{ fontSize: 19, color: 'var(--accent-2)' }} />
            </div>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
