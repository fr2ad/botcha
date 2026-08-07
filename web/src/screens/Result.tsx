import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import { SeatAvatar } from '../components/SeatAvatar';
import { renderShareCard } from '../shareCard';

export function Result() {
  const navigate = useNavigate();
  const { state, goHome, joinQueue } = useGame();
  const [sharing, setSharing] = useState(false);

  const result = state.result;
  const reveal = state.reveal;
  if (!result || !reveal) return <div className="screen" />;

  const outcomeLabel = result.outcome === 'correct' ? 'You caught the bot!' : result.outcome === 'wrong' ? "You picked wrong…" : "You didn't guess in time";

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
    <div className="screen" style={{ alignItems: 'center', paddingBottom: 18 }}>
      <div style={{ paddingTop: 26, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color: 'var(--accent)', textAlign: 'center' }}>
        {outcomeLabel}
      </div>

      <div style={{ display: 'flex', gap: 10, margin: '10px 0' }}>
        <span className="pill" style={{ background: 'var(--pill-bg)', padding: '5px 12px', fontSize: 11, fontWeight: 700 }}>
          {result.scoreDelta >= 0 ? '+' : ''}{result.scoreDelta} score
        </span>
        <span className="pill" style={{ background: 'var(--pill-bg)', padding: '5px 12px', fontSize: 11, fontWeight: 700 }}>
          {result.coinDelta >= 0 ? '+' : ''}{result.coinDelta} coins
        </span>
      </div>

      <div style={{ width: '100%', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reveal.identities.map((identity) => {
          const seat = state.roster.find((s) => s.seatIndex === identity.seatIndex);
          if (!seat) return null;
          const guess = reveal.guesses.find((g) => g.seatIndex === identity.seatIndex);
          const isMe = identity.seatIndex === state.mySeatIndex;
          return (
            <div
              key={identity.seatIndex}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: identity.isBot ? 'rgba(124,92,255,.14)' : 'var(--pill-bg)',
                borderRadius: 12,
                padding: '8px 10px'
              }}
            >
              <SeatAvatar letter={seat.avatar} color={seat.color} size={30} />
              <span style={{ fontSize: 11.5, flex: 1, color: identity.isBot ? undefined : isMe ? 'var(--text-1)' : 'var(--text-2)' }}>
                {seat.codeName} {identity.isBot ? '— the bot' : isMe ? '(you)' : ''}
              </span>
              {identity.isBot ? (
                <i className="hgi-stroke hgi-robot-01" style={{ fontSize: 14, color: '#a89bff' }} />
              ) : guess ? (
                guess.guessSeatIndex === null ? (
                  <span style={{ fontSize: 9, color: 'var(--text-6)' }}>no guess</span>
                ) : (
                  <i
                    className={`hgi-stroke ${guess.guessSeatIndex === reveal.botSeatIndex ? 'hgi-checkmark-circle-02' : 'hgi-cancel-circle'}`}
                    style={{ fontSize: 15, color: guess.guessSeatIndex === reveal.botSeatIndex ? 'var(--text-2)' : 'var(--text-6)' }}
                  />
                )
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 14, width: '100%' }}>
        <button className="btn-outline" style={{ flex: 1 }} onClick={share} disabled={sharing}>
          <i className="hgi-stroke hgi-share-01" style={{ fontSize: 13 }} />
          {sharing ? 'Saving…' : 'Share'}
        </button>
        <button className="btn-primary" style={{ flex: 1 }} onClick={playAgain}>
          Play again
        </button>
      </div>
      <button onClick={() => { goHome(); navigate('/home'); }} style={{ background: 'none', border: 'none', color: 'var(--text-6)', fontSize: 11, marginTop: 10 }}>
        Back to home
      </button>
    </div>
  );
}
