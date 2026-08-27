import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { submitFeedback } from '../api';
import { Confetti } from '../components/Ambient';
import { ChatTranscript } from '../components/ChatTranscript';
import { Orb } from '../components/Orb';
import { SeatAvatar } from '../components/SeatAvatar';
import { renderShareCard } from '../shareCard';

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function Result() {
  const navigate = useNavigate();
  const { state, goHome, joinQueue } = useGame();
  const [sharing, setSharing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const result = state.result;
  const reveal = state.reveal;
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
    if (!result || !reveal) return;
    setSharing(true);
    try {
      const inviteUrl = window.location.origin;
      const blob = await renderShareCard({
        outcome: result.outcome,
        scoreDelta: result.scoreDelta,
        coinDelta: result.coinDelta,
        rank: result.leaderboardRank,
        roster: state.roster,
        messages: state.messages,
        botSeatIndexes: reveal.botSeatIndexes,
        mySeatIndex: state.mySeatIndex,
        inviteUrl
      });
      const botLabel = botSeats.length > 1 ? `${botSeats.length} of them were bots` : `${botNames} was the bot`;
      const shareText = `${outcomeLabel} ${botLabel}. Think you can spot one? Play Botcha:`;
      const file = new File([blob], 'botcha-result.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Botcha', text: shareText, url: inviteUrl });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'botcha-result.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // user cancelled share sheet or export failed — no-op
    } finally {
      setSharing(false);
    }
  }

  async function sendFeedback() {
    if (!rating || !state.gameId || !state.player) return;
    setSendingFeedback(true);
    try {
      await submitFeedback(state.gameId, state.player.id, rating, comment.trim() || undefined);
      setFeedbackSent(true);
    } catch {
      // best-effort — a failed rating shouldn't block the rest of the screen
    } finally {
      setSendingFeedback(false);
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
          background: `radial-gradient(circle, ${correct ? 'rgba(56,217,122,.12)' : 'rgba(255,92,138,.1)'}, transparent 65%)`
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
          textShadow: correct ? '0 0 24px rgba(56,217,122,.4)' : undefined
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
            color: correct ? 'var(--green)' : 'var(--pink)'
          }}
        >
          {result.scoreDelta >= 0 ? '+' : ''}
          {result.scoreDelta} score
        </span>
        <span
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
            color: result.coinDelta > 0 ? 'var(--amber)' : 'var(--text-3)'
          }}
        >
          <i className="hgi-stroke hgi-coins-01" style={{ fontSize: 14 }} />+{result.coinDelta} coins
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
        Leaderboard <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>#{result.leaderboardRank}</span>
      </div>

      <div
        style={{
          width: '100%',
          borderTop: '1px solid rgba(255,255,255,.07)',
          marginTop: 24,
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

      {!feedbackSent ? (
        <div
          style={{
            width: '100%',
            marginTop: 20,
            padding: '14px 16px',
            borderRadius: 16,
            background: 'var(--panel)',
            border: '1px solid rgba(255,255,255,.07)'
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-5)', fontWeight: 800, marginBottom: 10 }}>
            RATE THIS GAME
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <i
                  className="hgi-stroke hgi-star"
                  style={{ fontSize: 22, color: n <= rating ? 'var(--amber)' : 'var(--text-5)' }}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <>
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
                  fontFamily: 'inherit'
                }}
              />
              <button
                className="btn-text"
                style={{ marginTop: 8 }}
                onClick={sendFeedback}
                disabled={sendingFeedback}
              >
                {sendingFeedback ? 'Sending…' : 'Send feedback'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 20, fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center' }}>
          Thanks for the feedback!
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16, width: '100%' }}>
        <button className="btn-outline" style={{ flex: 1 }} onClick={share} disabled={sharing}>
          <i className="hgi-stroke hgi-share-01" style={{ fontSize: 14 }} />
          {sharing ? 'Saving…' : 'Share'}
        </button>
        <button className="btn-primary" style={{ flex: 1.4 }} onClick={playAgain}>
          {correct ? 'Play again' : 'Run it back'}
        </button>
      </div>
      <button
        className="btn-text"
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
