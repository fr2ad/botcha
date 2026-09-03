import { SeatAvatar } from './SeatAvatar';
import type { ChatMessage, RosterEntry } from '../types';

// Humans mention through the avatar picker (Table.tsx), which always inserts
// the space-stripped "@CrimsonOwl" form. The bot only ever sees code names
// WITH the space in its prompt (room.ts feeds it "Crimson Owl: ..." chat
// history) and free-types its reply, so it naturally produces "@Crimson Owl"
// just as often — matching only the stripped form left a real bot message
// unhighlighted, a tell a guesser could use (SPEC §7). \s* between each word
// accepts either form (and any amount of whitespace) instead of requiring
// the bot to imitate the picker's exact string.
function mentionPattern(codeName: string) {
  const words = codeName
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return '@' + words.join('\\s*');
}

// Mentioning a seat is just a text convenience for readability — it does not
// change turn order or obligate that seat to reply (chat stays turn-based, see ADR-0001).
export function renderWithMentions(text: string, roster: { codeName: string }[]) {
  const patterns = roster.map((s) => mentionPattern(s.codeName)).filter(Boolean);
  if (patterns.length === 0) return text;
  // One capturing group wrapping the whole alternation — split() then puts
  // every matched mention at an odd index, so no separate re-match/compare
  // step is needed to tell a mention apart from plain text.
  const pattern = new RegExp(`(${patterns.join('|')})`, 'gi');
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
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
