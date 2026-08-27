import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { AVATAR_POOL, Orb } from '../components/Orb';

const MAX_NICK = 24;
const INVITE_REF_KEY = 'botcha_invite_ref';

export function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogleSignup } = useGame();
  // Set only when Landing routed here after a verified-but-new Google
  // sign-in (see api.googleLogin) — everyone else goes through mock-login.
  const googleId = (location.state as { googleId?: string } | null)?.googleId;
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_POOL[0]);
  // Prefilled from a shared `/#/?ref=CODE` link (captured in App.tsx), still
  // editable in case the visitor has their own code to use instead.
  const [inviteCode, setInviteCode] = useState(() => localStorage.getItem(INVITE_REF_KEY) ?? '');
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
      const code = inviteCode.trim() || undefined;
      if (googleId) await loginWithGoogleSignup(googleId, nickname.trim(), avatar, code);
      else await login(nickname.trim(), avatar, code);
      localStorage.removeItem(INVITE_REF_KEY);
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

      {/* A <form> around the single input is what makes Enter work on a virtual
          keyboard, where a keydown handler never sees 'Enter'. No submit button
          inside: one text field is enough for implicit submission, and the real
          button has to stay at the bottom of the screen's flex column. */}
      <form className="field" style={{ margin: '20px 0' }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, MAX_NICK))}
          placeholder="BlueberryQueen"
          maxLength={MAX_NICK}
          aria-label="Nickname"
          enterKeyHint="go"
        />
        {nickname.length === 0 && (
          <span style={{ width: 2, height: 16, background: 'var(--accent)', animation: 'blink 1.1s step-end infinite' }} />
        )}
        <span style={{ fontSize: 10, color: 'var(--text-5)' }}>
          {nickname.length}/{MAX_NICK}
        </span>
      </form>

      <div className="field" style={{ marginBottom: 20 }}>
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.trim().slice(0, 12))}
          placeholder="Invite code (optional)"
          aria-label="Invite code"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          justifyItems: 'center',
          ['--stagger' as string]: '30ms'
        }}
      >
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
