// Run: npx tsx src/config.test.ts
import assert from 'node:assert/strict';
import { AVATAR_POOL, CONFIG, SEAT_CODE_NAMES, botDelayMs, pickSeatIdentities } from './config.js';

assert.equal(SEAT_CODE_NAMES.length, 50, '50 seat names');
assert.equal(new Set(SEAT_CODE_NAMES.map((s) => s.name)).size, 50, 'names are unique');
assert.equal(
  new Set(SEAT_CODE_NAMES.map((s) => s.name.split(' ')[1])).size,
  50,
  'animals are unique, so two seats can never share one'
);
assert.equal(new Set(AVATAR_POOL).size, 15, '15 unique avatars');

// The point of picking by family: four seats a player must tell apart at a
// glance. Same color word twice, or two near-identical hues, breaks the game.
for (let i = 0; i < 500; i++) {
  const picked = pickSeatIdentities(4);
  assert.equal(picked.length, 4);
  assert.equal(new Set(picked.map((p) => p.name)).size, 4, 'no duplicate seat');
  assert.equal(new Set(picked.map((p) => p.name.split(' ')[0])).size, 4, 'no duplicate color word');
  assert.equal(new Set(picked.map((p) => p.color)).size, 4, 'no duplicate color');

  const hues = picked.map((p) => Number(/oklch\([\d.]+% [\d.]+ ([\d.]+)\)/.exec(p.color)![1])).sort((a, b) => a - b);
  for (let h = 1; h < hues.length; h++) {
    assert.ok(hues[h] - hues[h - 1] >= 30, `hues too close: ${hues.join(',')}`);
  }
}

// The bot's fake typing delay may never push its reply past the Turn deadline —
// that turns a written reply into a skipped Turn, which is worse than the tell
// it's covering up.
{
  const now = 1_000_000;
  const deadline = now + CONFIG.turnWindowMs;
  const longest = 'x'.repeat(CONFIG.maxMessageLength);
  for (let i = 0; i < 500; i++) {
    for (const [text, elapsed] of [
      [longest, 0],
      [longest, 9_000],
      ['ok', 0],
      ['ok', CONFIG.turnWindowMs - 100] // model came back with almost no window left
    ] as const) {
      const d = botDelayMs(text, elapsed, deadline, now);
      assert.ok(d >= 0, `never negative: ${d}`);
      assert.ok(now + d <= deadline - 500, `lands before the deadline: ${d}`);
    }
  }
  // A short reply from a fast model still waits — that's the whole point.
  assert.ok(botDelayMs('ok', 200, deadline, now) >= CONFIG.botThinkMinMs - 200);
}

console.log('config: ok — 50 names, 15 avatars, 500 draws all distinguishable, bot delay inside the Turn');
