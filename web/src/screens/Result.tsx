import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { submitFeedback } from '../api';
import { Confetti } from '../components/Ambient';
import { ChatTranscript } from '../components/ChatTranscript';
import { Orb } from '../components/Orb';
import { SeatAvatar } from '../components/SeatAvatar';
import { renderShareCard } from '../shareCard';
import { shareOrCopy } from '../share';
import { trackEvent } from '../firebase';

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const EMOJI_SCALE = ['😞', '😕', '😐', '🙂', '🤩'];
const FEEDBACK_SHOWN_KEY = 'botcha_feedback_shown';

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!rating || !state.gameId || !state.player) return;
    setSending(true);
    try {
      await submitFeedback(state.gameId, state.player.id, rating, comment.trim() || undefined);
      setSent(true);
      setTimeout(onClose, 900);
    } catch {
      // best-effort — a failed rating shouldn't trap the user in the modal
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal" role="dialog" aria-label="Rate Botcha">
      {sent ? (
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 14, color: 'var(--text-2)' }}>
          Thanks for the feedback!
        </div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 19, textAlign: 'center' }}>
            Enjoying Botcha so far?
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '20px 0 6px' }}>
            {EMOJI_SCALE.map((emoji, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} of 5`}
                  aria-pressed={rating === n}
                  style={{
                    background: rating === n ? 'rgba(124,110,246,.18)' : 'none',
                    border: rating === n ? '1px solid var(--accent)' : '1px solid transparent',
                    borderRadius: 12,
                    fontSize: 26,
                    padding: '6px 9px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    opacity: rating && rating !== n ? 0.45 : 1,
                    transition: 'opacity .2s ease'
                  }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Anything else? (optional)"
              rows={2}
              style={{
                width: '100%',
                resize: 'none',
                background: 'var(--log)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 12,
                padding: '8px 10px',
                color: 'var(--text-1)',
                fontSize: 13,
                fontFamily: 'inherit',
                marginTop: 14
              }}
            />
          )}
          <button className="btn-primary" style={{ marginTop: 18 }} onClick={send} disabled={!rating || sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
          <button className="btn-text" style={{ width: '100%' }} onClick={onClose}>
            Skip
          </button>
        </>
      )}
    </div>
  );
}

export function Result() {
  const navigate = useNavigate();
  const { state, goHome, joinQueue } = useGame();
  const [sharing, setSharing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Once ever, right after the 3rd game — a localStorage flag survives a
  // logout/relogin of the same device, unlike checking history.games alone
  // (which would fire again for anyone who plays a 4th, 5th... game if the
  // count check weren't exact — this belt-and-suspenders keeps it a single
  // ask no matter how state.player gets refreshed).
  useEffect(() => {
    if (state.player?.history.games === 3 && !localStorage.getItem(FEEDBACK_SHOWN_KEY)) {
      localStorage.setItem(FEEDBACK_SHOWN_KEY, '1');
      setShowFeedback(true);
    }
  }, [state.player?.history.games]);

  const result = state.result;
  const reveal = state.reveal;

  // Pre-rendered as soon as the reveal is in, not on tap: navigator.share()
  // needs a fresh user gesture, and the canvas draw in renderShareCard is
  // slow enough on iOS Safari to blow past that gesture's window — the share
  // sheet then silently fails to open and a repeat tap looks like nothing
  // happened. Building the card ahead of time means share() just awaits an
  // already-settled promise, so the sheet opens inside the tap that asked for it.
  const cardBlobRef = useRef<Promise<Blob> | null>(null);
  useEffect(() => {
    if (!result || !reveal || !state.player || cardBlobRef.current) return;
    const inviteCode = state.player.invite_code;
    cardBlobRef.current = renderShareCard({
      outcome: result.outcome,
      scoreDelta: result.scoreDelta,
      coinDelta: result.coinDelta,
      rank: result.leaderboardRank,
      roster: state.roster,
      messages: state.messages,
      botSeatIndexes: reveal.botSeatIndexes,
      mySeatIndex: state.mySeatIndex,
      inviteUrl: `${window.location.origin}/#/?ref=${inviteCode}`,
      inviteCode
    });
  }, [result, reveal, state.player, state.roster, state.messages, state.mySeatIndex]);

  if (!result || !reveal) return <div className="screen" />;

  const correct = result.outcome === 'correct';
  const outcomeLabel = correct
    ? 'You caught the bot!'
    : result.outcome === 'wrong'
      ? 'You picked wrong…'
      : "You didn't guess in time";
  const botSeats = reveal.botSeatIndexes
    .map((i) => state.roster.find((s) => s.seatIndex === i))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const botNames = joinNames(botSeats.map((s) => s.codeName));

  async function share() {
    if (!result || !reveal || !state.player) return;
    trackEvent('share_tap', { source: 'result' });
    setSharing(true);
    try {
      const inviteCode = state.player.invite_code;
      const inviteUrl = `${window.location.origin}/#/?ref=${inviteCode}`;
      const blob = await (cardBlobRef.current ??
        renderShareCard({
          outcome: result.outcome,
          scoreDelta: result.scoreDelta,
          coinDelta: result.coinDelta,
          rank: result.leaderboardRank,
          roster: state.roster,
          messages: state.messages,
          botSeatIndexes: reveal.botSeatIndexes,
          mySeatIndex: state.mySeatIndex,
          inviteUrl,
          inviteCode
        }));
      const botLabel = botSeats.length > 1 ? `${botSeats.length} of them were bots` : `${botNames} was the bot`;
      const shareText = `${outcomeLabel} ${botLabel}. Think you can spot one? Play Botcha, use my code ${inviteCode} for bonus coins:`;
      const file = new File([blob], 'botcha-result.png', { type: 'image/png' });
      await shareOrCopy({ title: 'Botcha', text: shareText, url: inviteUrl, file });
    } catch {
      // user cancelled share sheet or export failed — no-op
    } finally {
      setSharing(false);
    }
  }

  function playAgain() {
    goHome();
    joinQueue();
    navigate('/queue');
  }

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
          background: `radial-gradient(circle, ${correct ? 'rgba(56,217,122,.12)' : 'rgba(255,92,138,.1)'}, transparent 65%)`,
          animation: correct ? 'glowBloom .6s cubic-bezier(0.16,1,0.3,1) both' : undefined
        }}
      />
      {correct && <Confetti />}

      <div
        style={{
          paddingTop: 40,
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: 26,
          textAlign: 'center',
          color: correct ? 'var(--green)' : 'var(--pink)',
          textShadow: correct ? '0 0 24px rgba(56,217,122,.4)' : undefined,
          animation: correct ? 'winPop .6s cubic-bezier(0.16,1,0.3,1) both' : undefined
        }}
      >
        {outcomeLabel}
      </div>
      {result.outcome === 'wrong' && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
          {botNames} fooled you. It happens to the best.
        </div>
      )}
      {result.outcome === 'no_guess' && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
          The clock ran out — {botNames} {botSeats.length > 1 ? 'were' : 'was'} the bot{botSeats.length > 1 ? 's' : ''}.
        </div>
      )}

      <div className={correct ? undefined : 'shake'} style={{ display: 'flex', gap: 10, margin: '20px 0 6px' }}>
        <span
          className={correct ? 'pop' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: correct ? 'rgba(56,217,122,.12)' : 'rgba(255,92,138,.1)',
            border: `1px solid ${correct ? 'rgba(56,217,122,.4)' : 'rgba(255,92,138,.35)'}`,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 800,
            borderRadius: 999,
            color: correct ? 'var(--green)' : 'var(--pink)',
            ['--i' as string]: 4
          }}
        >
          {result.scoreDelta >= 0 ? '+' : ''}
          {result.scoreDelta} score
        </span>
        <span
          className={correct ? 'pop' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: result.coinDelta > 0 ? 'rgba(255,207,61,.1)' : 'var(--panel)',
            border: `1px solid ${result.coinDelta > 0 ? 'rgba(255,207,61,.35)' : 'rgba(255,255,255,.1)'}`,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 800,
            borderRadius: 999,
            color: result.coinDelta > 0 ? 'var(--amber)' : 'var(--text-3)',
            ['--i' as string]: 5
          }}
        >
          <i className="hgi-stroke hgi-coins-01" style={{ fontSize: 14 }} />+{result.coinDelta} coins
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
        Leaderboard <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>#{result.leaderboardRank}</span>
      </div>

      {/* Primary CTA moved above the identity reveal / chat replay so it sits
          with the rest of the outcome, right at the game's peak-end moment,
          instead of being buried under everything else on a long scroll. */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, width: '100%' }}>
        <button className="btn-outline" style={{ flex: 1 }} onClick={share} disabled={sharing}>
          <i className="hgi-stroke hgi-share-01" style={{ fontSize: 14 }} />
          {sharing ? 'Saving…' : 'Share'}
        </button>
        <button className="btn-primary" style={{ flex: 1.4 }} onClick={playAgain}>
          {correct ? 'Play again' : 'Run it back'}
        </button>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 8, textAlign: 'center' }}>
        The share card includes this table's chat — see Terms.
      </div>

      <div
        style={{
          width: '100%',
          borderTop: '1px solid rgba(255,255,255,.07)',
          marginTop: 14,
          paddingTop: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {reveal.identities.map((identity, i) => {
          const seat = state.roster.find((s) => s.seatIndex === identity.seatIndex);
          if (!seat) return null;
          const guess = reveal.guesses.find((g) => g.seatIndex === identity.seatIndex);
          const isMe = identity.seatIndex === state.mySeatIndex;
          const guessedRight = guess?.guessSeatIndex != null && reveal.botSeatIndexes.includes(guess.guessSeatIndex);
          return (
            <div
              key={identity.seatIndex}
              className="rise"
              style={{
                ['--i' as string]: i,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: identity.isBot ? 'rgba(124,110,246,.14)' : 'var(--panel)',
                border: identity.isBot ? '1px solid rgba(124,110,246,.35)' : '1px solid transparent',
                borderRadius: 16,
                padding: '11px 14px'
              }}
            >
              <SeatAvatar codeName={seat.codeName} color={seat.color} size={36} ringWidth={2} />
              <span
                style={{
                  fontSize: 13,
                  flex: 1,
                  fontWeight: identity.isBot ? 700 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 0
                }}
              >
                {seat.codeName}
                {identity.isBot ? (
                  ' — the bot'
                ) : (
                  <>
                    <span style={{ color: 'var(--text-5)' }}>·</span>
                    <Orb avatar={identity.avatar} size={18} />
                    <span
                      style={{
                        color: 'var(--text-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isMe ? 'you, ' : ''}"{identity.nickname}"
                    </span>
                  </>
                )}
              </span>
              {identity.isBot ? (
                <i className="hgi-stroke hgi-bot" style={{ fontSize: 17, color: 'var(--accent-2)' }} />
              ) : (
                <i
                  className={`hgi-stroke ${guessedRight ? 'hgi-checkmark-circle-02' : 'hgi-cancel-circle'}`}
                  style={{ fontSize: 16, color: guessedRight ? 'var(--green)' : 'var(--text-5)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {state.messages.length > 0 && (
        <div style={{ width: '100%', marginTop: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-5)', fontWeight: 800, marginBottom: 10 }}>
            CHAT REPLAY · <span style={{ color: 'var(--accent-2)' }}>bot lines highlighted</span>
          </div>
          <div
            style={{
              background: 'var(--log)',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 20,
              padding: 16,
              maxHeight: 220,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <ChatTranscript
              messages={state.messages}
              roster={state.roster}
              mySeatIndex={state.mySeatIndex}
              highlightSeatIndexes={reveal.botSeatIndexes}
            />
          </div>
        </div>
      )}

      {showFeedback && <div className="scrim" onClick={() => setShowFeedback(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      <button
        className="btn-text"
        style={{ marginTop: 16 }}
        onClick={() => {
          goHome();
          navigate('/home');
        }}
      >
        Back to home
      </button>
    </div>
  );
}
