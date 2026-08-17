import { SeatAvatar } from './SeatAvatar';
import type { ChatMessage, RosterEntry } from '../types';

function mentionToken(codeName: string) {
  return '@' + codeName.replace(/\s+/g, '');
}

// Mentioning a seat is just a text convenience for readability — it does not
// change turn order or obligate that seat to reply (chat stays turn-based, see ADR-0001).
export function renderWithMentions(text: string, roster: { codeName: string }[]) {
  const tokens = roster.map((s) => mentionToken(s.codeName)).filter(Boolean);
  if (tokens.length === 0) return text;
  const pattern = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).map((part, i) =>
    tokens.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
      <span key={i} style={{ color: 'var(--accent-2)', fontWeight: 700 }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

type Props = {
  messages: ChatMessage[];
  roster: RosterEntry[];
  mySeatIndex: number | null;
  // Seats to glow-highlight as Bots — only ever passed post-reveal (Result),
  // never during Guess, where that would just hand the answer away.
  highlightSeatIndexes?: number[];
  emptyText?: string;
};

export function ChatTranscript({ messages, roster, mySeatIndex, highlightSeatIndexes, emptyText }: Props) {
  const seatByIndex = (i: number) => roster.find((s) => s.seatIndex === i);

  if (messages.length === 0 && emptyText) {
    return <div style={{ fontSize: 12, color: 'var(--text-5)' }}>{emptyText}</div>;
  }

  return (
    <>
      {messages.map((m, i) => {
        const seat = seatByIndex(m.seatIndex);
        const color = seat?.color ?? 'var(--text-5)';
        const highlighted = highlightSeatIndexes?.includes(m.seatIndex);
        return (
          <div
            key={i}
            className="rise"
            style={{
              display: 'flex',
              gap: 9,
              borderRadius: 14,
              padding: highlighted ? '8px 10px' : 0,
              background: highlighted ? 'rgba(255,92,138,.1)' : undefined,
              border: highlighted ? '1px solid rgba(255,92,138,.45)' : undefined,
              boxShadow: highlighted ? '0 0 16px rgba(255,92,138,.18)' : undefined
            }}
          >
            <SeatAvatar codeName={seat?.codeName ?? '?'} color={color} size={24} ringWidth={2} />
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 5 }}>
                {seat?.codeName}
                {m.seatIndex === mySeatIndex && <span style={{ color: 'var(--text-5)', fontWeight: 600 }}> · you</span>}
                {highlighted && <i className="hgi-stroke hgi-bot" style={{ fontSize: 11, color: 'var(--pink)' }} />}
              </div>
              <div style={{ fontSize: 13, color: '#cfd2e0', lineHeight: 1.45 }}>{renderWithMentions(m.text, roster)}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
