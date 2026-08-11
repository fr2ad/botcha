import { useState } from 'react';
import { botTestReply } from '../api';

type Line = { speaker: string; text: string };

// Debug-only page: talk to the bot directly, no matchmaking/login needed.
// Not linked from anywhere in the game UI — visit /#/bot-test.
export function BotTest() {
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    const history = [...lines, { speaker: 'you', text }];
    setLines(history);
    setDraft('');
    setLoading(true);
    setError(null);
    try {
      const { reply, persona } = await botTestReply(history);
      setLines((cur) => [...cur, { speaker: `bot (${persona})`, text: reply || '(empty — check server logs)' }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <h3 style={{ margin: '0 0 12px' }}>Bot test</h3>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {lines.map((l, i) => (
          <div key={i}>
            <b>{l.speaker}:</b> {l.text}
          </div>
        ))}
        {loading && <div style={{ opacity: 0.6 }}>bot is typing…</div>}
        {error && <div style={{ color: 'crimson' }}>error: {error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="say something…"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={send} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
