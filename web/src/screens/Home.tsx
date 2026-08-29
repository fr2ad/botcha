import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { Ambient } from '../components/Ambient';
import { AVATAR_POOL, Orb } from '../components/Orb';
import { InstallPrompt } from '../components/InstallPrompt';
import { enablePushNotifications, getPushStatus, type PushStatus } from '../firebase';
import { shareOrCopy } from '../share';

const COIN_ENTRY_PRICE = 25;
const DAILY_HEARTS = 5;

// Server resets hearts on a UTC day stamp (server/src/db/index.ts), so the
// refill lands at the next UTC midnight — no need to invent a countdown.
function untilRefill() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const mins = Math.max(0, Math.round((next - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function Home() {
  const navigate = useNavigate();
  const { state, joinQueue } = useGame();
  const [sheet, setSheet] = useState<'hearts' | 'how' | 'profile' | null>(null);
  const player = state.player;

  if (!player) return null;

  const canPlayFree = player.hearts_remaining > 0;
  const canPayCoins = player.coins >= COIN_ENTRY_PRICE;

  function startGame() {
    joinQueue();
    navigate('/queue');
  }

  function handlePlay() {
    if (canPlayFree) startGame();
    else setSheet('hearts');
  }

  return (
    <div className="screen">
      {/* A real box, not display:contents — `filter` needs one to blur. */}
      <div
        className={sheet ? 'blurred' : undefined}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Ambient washTop={180} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip">
              <i className="hgi-stroke hgi-favourite" style={{ color: 'var(--pink)', fontSize: 14 }} />
              {player.hearts_remaining}/{DAILY_HEARTS}
            </span>
            <span className="chip">
              <i className="hgi-stroke hgi-coins-01" style={{ color: 'var(--amber)', fontSize: 14 }} />
              {player.coins}
            </span>
          </div>
          <Orb avatar={player.avatar} size={40} ring="var(--accent)" onClick={() => setSheet('profile')} />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            position: 'relative'
          }}
        >
          <div style={{ position: 'relative', width: 230, height: 230, display: 'grid', placeItems: 'center' }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid rgba(124,110,246,.25)',
                animation: 'ringPulse 2.6s ease-out infinite'
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 26,
                borderRadius: '50%',
                border: '1px solid rgba(124,110,246,.35)',
                animation: 'ringPulse 2.6s ease-out .6s infinite'
              }}
            />
            <button
              onClick={handlePlay}
              className="pulse"
              style={{
                width: 158,
                height: 158,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%,#9184ff,var(--accent-deep) 70%)',
                border: 'none',
                color: '#fff',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: 28,
                letterSpacing: 1,
                position: 'relative'
              }}
            >
              Play
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-3)' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 8px rgba(56,217,122,.8)'
              }}
            />
            {state.onlineCount} {state.onlineCount === 1 ? 'player' : 'players'} online
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={() => navigate('/leaderboard')}>
            <i className="hgi-stroke hgi-medal-01" style={{ fontSize: 15, color: 'var(--amber)' }} />
            Leaderboard
          </button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={() => setSheet('how')}>
            <i className="hgi-stroke hgi-book-01" style={{ fontSize: 15, color: 'var(--accent-2)' }} />
            How to play
          </button>
        </div>
      </div>

      {sheet && <div className="scrim" onClick={() => setSheet(null)} />}

      {sheet === 'hearts' && (
        <div className="sheet" role="dialog" aria-label="Out of hearts">
          <div className="sheet-grab" />
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 20, textAlign: 'center' }}>
            Out of hearts
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 9, margin: '16px 0 6px' }}>
            {Array.from({ length: DAILY_HEARTS }, (_, i) => (
              <i
                key={i}
                className="hgi-stroke hgi-favourite pop"
                style={{ ['--i' as string]: i, fontSize: 22, color: '#33344d' }}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
            Hearts refill in <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>{untilRefill()}</span>
          </div>
          <button className="btn-primary" style={{ marginTop: 22 }} onClick={startGame} disabled={!canPayCoins}>
            <i className="hgi-stroke hgi-coins-01" style={{ fontSize: 16, color: 'var(--amber)' }} />
            {canPayCoins ? `Play for ${COIN_ENTRY_PRICE} coins` : `Need ${COIN_ENTRY_PRICE} coins`}
          </button>
          <button className="btn-text" style={{ width: '100%' }} onClick={() => setSheet(null)}>
            Come back tomorrow
          </button>
        </div>
      )}

      {sheet === 'profile' && <Profile onClose={() => setSheet(null)} />}

      {sheet === 'how' && <HowToPlay onClose={() => setSheet(null)} />}

      {/* Home is the only screen it may interrupt — never mid-game. */}
      {!sheet && <InstallPrompt gamesPlayed={player.history.games} />}
    </div>
  );
}

function Profile({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { state, changeAvatar, logout } = useGame();
  const [picking, setPicking] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const player = state.player;

  async function shareInvite() {
    if (!player) return;
    const url = `${window.location.origin}/#/?ref=${player.invite_code}`;
    try {
      await shareOrCopy({
        title: 'Botcha',
        text: `Join me on Botcha — spot the bot at the table. Use my code ${player.invite_code} for bonus coins:`,
        url
      });
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // user cancelled the share sheet — no-op
    }
  }

  // Only reads the current state — the actual permission request has to come
  // from the button's click handler, since browsers ignore it without a
  // user gesture.
  useEffect(() => {
    getPushStatus().then(setPush);
  }, []);

  if (!player) return null;

  async function pick(avatar: string) {
    setError(null);
    try {
      await changeAvatar(avatar);
      setPicking(false);
    } catch {
      setError("Couldn't save that — try again.");
    }
  }

  function confirmLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="sheet" role="dialog" aria-label="Your profile">
      <div className="sheet-grab" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Orb avatar={player.avatar} size={64} ring="var(--accent)" />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 600,
              fontSize: 20,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {player.nickname}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
            Rank <span style={{ color: 'var(--accent-2)', fontWeight: 800 }}>#{player.rank}</span> ·{' '}
            {player.score} score
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <Stat label="caught" value={player.history.correct} color="var(--green)" />
        <Stat label="missed" value={player.history.wrong + player.history.noGuess} color="var(--pink)" />
        <Stat label="games" value={player.history.games} color="var(--text-2)" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 14,
          background: 'var(--surface)'
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9.5, letterSpacing: 1, color: 'var(--text-5)', fontWeight: 800 }}>INVITE CODE</div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
            {player.invite_code}
          </div>
        </div>
        <button className="btn-outline" style={{ flexShrink: 0, padding: '8px 14px' }} onClick={shareInvite}>
          <i className={`hgi-stroke ${inviteCopied ? 'hgi-checkmark-circle-02' : 'hgi-share-01'}`} style={{ fontSize: 14 }} />
          {inviteCopied ? 'Done' : 'Share'}
        </button>
      </div>

      {picking ? (
        <>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              fontWeight: 800,
              color: 'var(--text-5)',
              margin: '22px 0 12px'
            }}
          >
            PICK A NEW LOOK
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 12,
              justifyItems: 'center',
              ['--stagger' as string]: '25ms'
            }}
          >
            {AVATAR_POOL.map((a, i) => (
              <div key={a} className="pop" style={{ ['--i' as string]: i }}>
                <Orb avatar={a} size={48} selected={player.avatar === a} onClick={() => pick(a)} />
              </div>
            ))}
          </div>
          <button className="btn-text" style={{ width: '100%' }} onClick={() => setPicking(false)}>
            Done
          </button>
        </>
      ) : confirmingLogout ? (
        <>
          <div
            style={{
              marginTop: 20,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,92,138,.1)',
              border: '1px solid rgba(255,92,138,.35)',
              fontSize: 12,
              color: 'var(--text-2)',
              lineHeight: 1.5
            }}
          >
            Log out and this account is gone for good — sign-in is still mocked, so there's no way back to{' '}
            <b>{player.nickname}</b>, your {player.score} score, or your {player.coins} coins.
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 14, background: 'var(--pink)', boxShadow: '0 0 24px rgba(255,92,138,.4)' }}
            onClick={confirmLogout}
          >
            Yes, log out
          </button>
          <button className="btn-text" style={{ width: '100%' }} onClick={() => setConfirmingLogout(false)}>
            Keep me signed in
          </button>
        </>
      ) : (
        <>
          <button className="btn-outline" style={{ width: '100%', marginTop: 20 }} onClick={() => setPicking(true)}>
            <i className="hgi-stroke hgi-user-circle" style={{ fontSize: 15, color: 'var(--accent-2)' }} />
            Change avatar
          </button>

          {push && push !== 'unavailable' && (
            <>
              <button
                className="btn-outline"
                style={{ width: '100%', marginTop: 10 }}
                disabled={push === 'granted' || push === 'denied' || push === 'needs-install'}
                onClick={async () => setPush(await enablePushNotifications(player!.id))}
              >
                <i
                  className={`hgi-stroke ${push === 'granted' ? 'hgi-checkmark-circle-02' : 'hgi-notification-01'}`}
                  style={{ fontSize: 15, color: push === 'granted' ? 'var(--green)' : 'var(--accent-2)' }}
                />
                {push === 'granted' ? 'Notifications on' : 'Notify me when hearts refill'}
              </button>
              {(push === 'denied' || push === 'needs-install') && (
                <div style={{ fontSize: 10.5, color: 'var(--text-5)', marginTop: 6, textAlign: 'center', lineHeight: 1.5 }}>
                  {push === 'denied'
                    ? 'Notifications are blocked for this site — turn them back on in your browser settings.'
                    : 'On iPhone, add Botcha to your Home Screen first — Safari only allows notifications for installed apps.'}
                </div>
              )}
            </>
          )}
          <button
            className="btn-outline"
            style={{ width: '100%', marginTop: 10, color: 'var(--pink)', borderColor: 'rgba(255,92,138,.35)' }}
            onClick={() => setConfirmingLogout(true)}
          >
            <i className="hgi-stroke hgi-logout-03" style={{ fontSize: 15 }} />
            Log out
          </button>
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              fontSize: 10.5,
              color: 'var(--text-5)'
            }}
          >
            <Link to="/privacy" style={{ color: 'var(--text-4)' }}>
              Privacy
            </Link>
            <span>·</span>
            <Link to="/terms" style={{ color: 'var(--text-4)' }}>
              Terms
            </Link>
          </div>
          <button className="btn-text" style={{ width: '100%' }} onClick={onClose}>
            Close
          </button>
        </>
      )}

      {error && (
        <div className="shake" style={{ color: 'var(--pink)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '10px 0',
        textAlign: 'center'
      }}
    >
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color }}>{value}</div>
      <div style={{ fontSize: 9.5, letterSpacing: 1, color: 'var(--text-5)', fontWeight: 800 }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

const HOW_STEPS = [
  {
    icon: 'hgi-user-group',
    title: 'Take a seat',
    body: '4 seats, anonymous code names. 3 are human. 1 is an AI pretending to be.'
  },
  {
    icon: 'hgi-message-01',
    title: 'Chat 3 rounds',
    body: 'Turn-based — 30 seconds per turn. Probe, bluff, watch for tells.'
  },
  {
    icon: 'hgi-search-01',
    title: 'Guess in secret',
    body: 'Catch the bot for +20 and +5 coins. Miss it and you drop 10.'
  }
];

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-label="How to play">
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 21, textAlign: 'center' }}>
        How to play
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 24 }}>
        {HOW_STEPS.map((s, i) => (
          <div key={s.title} className="rise" style={{ ['--i' as string]: i + 1, display: 'flex', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(124,110,246,.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <i className={`hgi-stroke ${s.icon}`} style={{ fontSize: 18, color: 'var(--accent-2)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 2 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
        {['3 rounds', '30s turns', '~4 min games'].map((f) => (
          <span
            key={f}
            style={{
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 10,
              color: 'var(--text-3)',
              fontWeight: 700
            }}
          >
            {f}
          </span>
        ))}
      </div>

      <button className="btn-primary" style={{ marginTop: 24 }} onClick={onClose}>
        Got it
      </button>
    </div>
  );
}
