import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

const AVATAR_POOL = ['🦝', '🐑', '🐺', '🦄', '🦉', '🐴', '🐼', '🦔', '🐨', '🐱', '🐶', '🦊'];

export function Onboarding() {
  const navigate = useNavigate();
  const { login } = useGame();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_POOL[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!nickname.trim()) {
      setError('Pick a nickname first');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(nickname.trim(), avatar);
      navigate('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      <div className="topnav">
        <button className="icon-btn back" onClick={() => navigate(-1)} aria-label="Back">
          <i className="hgi-stroke hgi-arrow-left-01" />
        </button>
      </div>

      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 17, marginTop: 8 }}>Pick your look</div>

      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder={'Nickname… "BlueberryQueen"'}
        maxLength={24}
        style={{
          width: '100%',
          background: 'var(--pill-bg)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '12px 16px',
          margin: '14px 0',
          color: 'var(--text-1)',
          fontSize: 13,
          outline: 'none'
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, width: '100%' }}>
        {AVATAR_POOL.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--pill-bg)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: avatar === a ? '0 0 0 3px var(--accent)' : undefined
            }}
          >
            {a}
          </button>
        ))}
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          color: '#a89bff',
          borderRadius: 999,
          padding: '6px 14px',
          fontSize: 10,
          marginTop: 16,
          alignSelf: 'center'
        }}
      >
        ✨ +50 coins for signing up
      </div>

      {error && <div style={{ color: 'var(--pink)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>{error}</div>}

      <button className="btn-primary" style={{ marginTop: 'auto' }} onClick={submit} disabled={busy}>
        {busy ? 'One sec…' : "Let's go"}
      </button>
    </div>
  );
}
