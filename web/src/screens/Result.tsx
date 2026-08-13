import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { Confetti } from '../components/Ambient';
import { Orb } from '../components/Orb';
import { SeatAvatar } from '../components/SeatAvatar';
import { renderShareCard } from '../shareCard';

export function Result() {
  const navigate = useNavigate();
  const { state, goHome, joinQueue } = useGame();
  const [sharing, setSharing] = useState(false);

  const result = state.result;
  const reveal = state.reveal;
  if (!result || !reveal) return <div className="screen" />;

  const correct = result.outcome === 'correct';
  const outcomeLabel = correct
    ? 'You caught the bot!'
    : result.outcome === 'wrong'
      ? 'You picked wrong…'
      : "You didn't guess in time";
  const botSeat = state.roster.find((s) => s.seatIndex === reveal.botSeatIndex);

  async function share() {
    if (!result) return;
    setSharing(true);
    try {
      const blob = await renderShareCard({
        outcome: result.outcome,
        scoreDelta: result.scoreDelta,
        coinDelta: result.coinDelta,
        rank: result.leaderboardRank
      });
      const file = new File([blob], 'botcha-result.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Botcha', text: outcomeLabel });
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
          {botSeat?.codeName} fooled you. It happens to the best.
        </div>
      )}
      {result.outcome === 'no_guess' && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
          The clock ran out — {botSeat?.codeName} was the bot.
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
          const guessedRight = guess?.guessSeatIndex === reveal.botSeatIndex;
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
