import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { googleLogin } from '../api';
import { Ambient } from '../components/Ambient';
import { ChatTranscript } from '../components/ChatTranscript';
import { Wordmark } from '../components/Wordmark';
import { useGame } from '../GameContext';
import { trackEvent } from '../firebase';
import type { ChatMessage, RosterEntry } from '../types';

const STEPS = [
  { icon: 'hgi-user-group', label: 'join a table' },
  { icon: 'hgi-message-01', label: 'chat 3 rounds' },
  { icon: 'hgi-search-01', label: 'guess a bot' }
];

// A real transcript shape, hand-written rather than pulled from a live game —
// cold traffic never sees gameplay otherwise, since everything past this
// screen sits behind a login. Revealed on a delay so the preview plays out
// the way an actual round does: read first, find out after.
const SAMPLE_ROSTER: RosterEntry[] = [
  { seatIndex: 0, codeName: 'Crimson Owl', color: 'oklch(70% 0.16 25)', nickname: '', avatar: '' },
  { seatIndex: 1, codeName: 'Azure Hawk', color: 'oklch(70% 0.16 225)', nickname: '', avatar: '' },
  { seatIndex: 2, codeName: 'Rose Quail', color: 'oklch(70% 0.16 350)', nickname: '', avatar: '' }
];
const SAMPLE_MESSAGES: ChatMessage[] = [
  { seatIndex: 0, round: 1, text: 'ok everyone be honest, who skipped leg day' },
  { seatIndex: 1, round: 1, text: 'lmaooo not me. @CrimsonOwl you sound nervous already' },
  { seatIndex: 2, round: 1, text: 'i work out every single day without fail, it is important for maintaining physical health' }
];
const SAMPLE_BOT_SEAT = [2];

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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    trackEvent('landing_view');
  }, []);

  // Loops so a visitor who lingers still sees the reveal, not just the setup.
  useEffect(() => {
    const t = setInterval(() => setRevealed((r) => !r), 3200);
    return () => clearInterval(t);
  }, []);

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

      <div
        style={{
          width: '100%',
          maxWidth: 320,
          marginTop: 26,
          textAlign: 'left',
          background: 'var(--panel)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16,
          padding: '16px 16px 14px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ChatTranscript
            messages={SAMPLE_MESSAGES}
            roster={SAMPLE_ROSTER}
            mySeatIndex={null}
            highlightSeatIndexes={revealed ? SAMPLE_BOT_SEAT : []}
          />
        </div>
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,.06)',
            fontSize: 10.5,
            fontWeight: 800,
            color: revealed ? 'var(--pink)' : 'var(--text-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <i className={`hgi-stroke ${revealed ? 'hgi-bot' : 'hgi-search-01'}`} style={{ fontSize: 12 }} />
          {revealed ? 'Rose Quail was the bot.' : 'One of these three is a bot.'}
        </div>
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

      <div style={{ marginTop: 34, fontSize: 10.5, color: 'var(--text-5)', display: 'flex', gap: 8 }}>
        <Link to="/privacy" style={{ color: 'var(--text-4)' }}>
          Privacy
        </Link>
        <span>·</span>
        <Link to="/terms" style={{ color: 'var(--text-4)' }}>
          Terms
        </Link>
      </div>
    </div>
  );
}
