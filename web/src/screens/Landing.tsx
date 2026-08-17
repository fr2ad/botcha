import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleLogin } from '../api';
import { Ambient } from '../components/Ambient';
import { Wordmark } from '../components/Wordmark';
import { useGame } from '../GameContext';

const STEPS = [
  { icon: 'hgi-user-group', label: 'join a table' },
  { icon: 'hgi-message-01', label: 'chat 3 rounds' },
  { icon: 'hgi-search-01', label: 'guess a bot' }
];

// Unset -> the button below just goes to the mocked nickname/avatar flow,
// exactly like before. Set -> it's replaced with Google's own rendered
// button, which is what actually gets us an ID token (see api.googleLogin).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function Landing() {
  const navigate = useNavigate();
  const { loginWithExistingPlayer } = useGame();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    async function onCredential(resp: { credential: string }) {
      const result = await googleLogin(resp.credential);
      if ('player' in result) {
        loginWithExistingPlayer(result.player);
        navigate('/home');
      } else {
        navigate('/onboarding', { state: { googleId: result.googleId } });
      }
    }

    // Loaded on demand rather than unconditionally in index.html — no point
    // pulling in Google's script for installs that never configure this.
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID!, callback: onCredential });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        width: 260,
        // GIS follows the browser's locale by default, which renders a French
        // button under an otherwise English UI. The rest of Botcha isn't
        // localized yet, so pin it until it is.
        locale: 'en'
      });
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [navigate, loginWithExistingPlayer]);

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Ambient />

      <Wordmark size={46} />

      <div style={{ marginTop: 14, fontSize: 16, color: 'var(--text-2)', lineHeight: 1.5 }}>
        1-3 bots at the table.
        <br />
        <span style={{ color: 'var(--accent-2)', fontWeight: 800 }}>Find them.</span>
      </div>

      {GOOGLE_CLIENT_ID ? (
        <div ref={googleBtnRef} style={{ marginTop: 34, minHeight: 44 }} />
      ) : (
        <>
          <button
            className="btn-primary pulse"
            style={{ width: 260, marginTop: 34 }}
            onClick={() => navigate('/onboarding')}
          >
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
        </>
      )}

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
