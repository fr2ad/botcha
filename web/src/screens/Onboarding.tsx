import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { AVATAR_POOL, Orb } from '../components/Orb';

const MAX_NICK = 24;

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
    <div className="screen">
      <div className="topnav">
        <button className="icon-btn back" onClick={() => navigate(-1)} aria-label="Back">
          <i className="hgi-stroke hgi-arrow-left-01" />
        </button>
      </div>

      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 22, marginTop: 14 }}>
        Pick your look
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
        This is who your friends see — the table never will.
      </div>

      <div className="field" style={{ margin: '20px 0' }}>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, MAX_NICK))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="BlueberryQueen"
          maxLength={MAX_NICK}
          aria-label="Nickname"
        />
        {nickname.length === 0 && (
          <span style={{ width: 2, height: 16, background: 'var(--accent)', animation: 'blink 1.1s step-end infinite' }} />
        )}
        <span style={{ fontSize: 10, color: 'var(--text-5)' }}>
          {nickname.length}/{MAX_NICK}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, justifyItems: 'center' }}>
        {AVATAR_POOL.map((a, i) => (
          <div key={a} className="pop" style={{ ['--i' as string]: i }}>
            <Orb avatar={a} selected={avatar === a} onClick={() => setAvatar(a)} />
          </div>
        ))}
      </div>

      <div
        style={{
          alignSelf: 'center',
          border: '1px solid rgba(124,110,246,.4)',
          color: 'var(--accent-2)',
          borderRadius: 999,
          padding: '7px 16px',
          fontSize: 11,
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <i className="hgi-stroke hgi-coins-01" style={{ fontSize: 13, color: 'var(--amber)' }} />
        +50 coins for signing up
      </div>

      {error && (
        <div className="shake" style={{ color: 'var(--pink)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <button className="btn-primary" style={{ marginTop: 'auto' }} onClick={submit} disabled={busy}>
        {busy ? 'One sec…' : "Let's go"}
      </button>
    </div>
  );
}
