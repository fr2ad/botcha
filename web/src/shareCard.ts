import type { ChatMessage, RosterEntry } from './types';

// Rendered entirely client-side on a canvas — no server round-trip.
//
// The card carries the actual table: who sat where, which seats turned out to
// be bots, and the chat that led to the guess. That's the shareable part; a
// bare score is not. It does mean other players' messages end up in an image
// the sharer can post anywhere, which is a deliberate product call.
const W = 1000;
// The card grows with the transcript instead of being a fixed box — a short
// game left a large empty panel, a long one got truncated early. Clamped at
// both ends so it stays a sane social-media aspect ratio either way.
const MIN_H = 1000;
const MAX_H = 1750;

const BG = '#0a0a12';
const PANEL = '#14162a';
const TEXT_1 = '#eef0ff';
const TEXT_3 = '#8f94b3';
const TEXT_5 = '#565a72';
const ACCENT = '#7c5cff';
const PINK = '#ff5c8a';
const GREEN = '#38d97a';

export type ShareCardData = {
  outcome: 'correct' | 'wrong' | 'no_guess';
  scoreDelta: number;
  coinDelta: number;
  rank: number;
  roster: RosterEntry[];
  messages: ChatMessage[];
  botSeatIndexes: number[];
  mySeatIndex: number | null;
  inviteUrl: string;
  inviteCode: string;
};

const BOX_TOP = 450;
const LINE_H = 31;
const NAME_GAP = 30;
const MSG_GAP = 26;
const FOOTER_H = 220;

export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Fredoka/Nunito load over the network; drawing before they're ready
  // silently falls back to a system font and the card looks wrong. Fonts also
  // have to be ready before measuring, or the layout pass below is wrong too.
  await document.fonts.ready.catch(() => {});

  // Pass 1: lay the transcript out to find how tall the card needs to be.
  ctx.font = '400 23px Nunito, sans-serif';
  const laid: Array<{ m: ChatMessage; lines: string[] }> = [];
  let contentH = 0;
  let overflow = 0;
  const maxContentH = MAX_H - BOX_TOP - FOOTER_H - 96;

  for (const m of d.messages) {
    const isBot = d.botSeatIndexes.includes(m.seatIndex);
    ctx.font = `${isBot ? '700' : '400'} 23px Nunito, sans-serif`;
    const lines = layoutLines(ctx, m.text, W - 220);
    const blockH = NAME_GAP + lines.length * LINE_H + MSG_GAP;
    if (contentH + blockH > maxContentH) {
      overflow = d.messages.length - laid.length;
      break;
    }
    contentH += blockH;
    laid.push({ m, lines });
  }
  if (overflow > 0) contentH += 34;

  const H = Math.min(MAX_H, Math.max(MIN_H, BOX_TOP + 96 + contentH + 34 + FOOTER_H));
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const correct = d.outcome === 'correct';
  const glow = ctx.createRadialGradient(W / 2, 190, 0, W / 2, 190, 420);
  glow.addColorStop(0, correct ? 'rgba(56,217,122,.20)' : 'rgba(255,92,138,.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 620);

  ctx.textAlign = 'center';
  ctx.fillStyle = correct ? GREEN : PINK;
  ctx.font = '700 62px Fredoka, sans-serif';
  ctx.fillText(correct ? 'I caught the bot!' : d.outcome === 'wrong' ? 'The bot fooled me' : "I didn't guess in time", W / 2, 140);

  ctx.font = '800 34px Fredoka, sans-serif';
  ctx.fillStyle = TEXT_1;
  ctx.fillText(
    `${d.scoreDelta >= 0 ? '+' : ''}${d.scoreDelta} score   ·   +${d.coinDelta} coins   ·   rank #${d.rank}`,
    W / 2,
    200
  );

  // ---- the table: every seat, bots marked -----------------------------------
  const seats = d.roster;
  const colW = W / Math.max(seats.length, 1);
  const seatY = 300;
  seats.forEach((seat, i) => {
    const cx = colW * i + colW / 2;
    const isBot = d.botSeatIndexes.includes(seat.seatIndex);

    ctx.beginPath();
    ctx.arc(cx, seatY, 46, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = seat.color;
    ctx.stroke();

    if (isBot) {
      ctx.fillStyle = 'rgba(255,92,138,.16)';
      ctx.fill();
    }

    ctx.fillStyle = seat.color;
    ctx.font = '700 38px Fredoka, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(seat.codeName.split(' ')[1]?.[0] ?? '?', cx, seatY + 2);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = isBot ? PINK : TEXT_3;
    ctx.font = `${isBot ? '800' : '600'} 20px Nunito, sans-serif`;
    ctx.fillText(fit(ctx, seat.codeName, colW - 20), cx, seatY + 78);

    ctx.font = '800 17px Nunito, sans-serif';
    if (isBot) {
      ctx.fillStyle = PINK;
      ctx.fillText('BOT', cx, seatY + 102);
    } else if (seat.seatIndex === d.mySeatIndex) {
      ctx.fillStyle = TEXT_5;
      ctx.fillText('YOU', cx, seatY + 102);
    }
  });

  // ---- transcript -----------------------------------------------------------
  const boxBottom = H - FOOTER_H;
  roundRect(ctx, 60, BOX_TOP, W - 120, boxBottom - BOX_TOP, 28);
  ctx.fillStyle = PANEL;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_5;
  ctx.font = '800 20px Nunito, sans-serif';
  ctx.fillText('THE TABLE', 96, BOX_TOP + 46);

  const seatFor = (i: number) => d.roster.find((s) => s.seatIndex === i);
  let y = BOX_TOP + 96;

  for (const { m, lines } of laid) {
    const seat = seatFor(m.seatIndex);
    const isBot = d.botSeatIndexes.includes(m.seatIndex);

    ctx.fillStyle = seat?.color ?? TEXT_5;
    ctx.font = '800 21px Nunito, sans-serif';
    ctx.fillText((seat?.codeName ?? '?') + (isBot ? '  🤖' : ''), 96, y);

    ctx.fillStyle = isBot ? '#ffd7e3' : '#cfd2e0';
    ctx.font = `${isBot ? '700' : '400'} 23px Nunito, sans-serif`;
    y += NAME_GAP;
    for (const line of lines) {
      ctx.fillText(line, 96, y);
      y += LINE_H;
    }
    y += MSG_GAP;
  }

  if (overflow > 0) {
    ctx.fillStyle = TEXT_5;
    ctx.font = '400 20px Nunito, sans-serif';
    ctx.fillText(`+ ${overflow} more messages`, 96, y);
  }

  // ---- footer: wordmark + invite -------------------------------------------
  // The invite code gets its own prominent line — the card is what actually
  // gets forwarded/screenshotted, and a caption or link is easy to lose
  // along the way, but text baked into the image survives.
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = '700 40px Fredoka, sans-serif';
  ctx.fillText('BOTCHA', W / 2, H - 148);

  ctx.fillStyle = TEXT_3;
  ctx.font = '600 24px Nunito, sans-serif';
  ctx.fillText('1-3 bots at the table. Can you find them?', W / 2, H - 110);

  ctx.fillStyle = GREEN;
  ctx.font = '800 26px Nunito, sans-serif';
  ctx.fillText(`USE CODE ${d.inviteCode}`, W / 2, H - 68);

  ctx.fillStyle = TEXT_5;
  ctx.font = '700 22px Nunito, sans-serif';
  ctx.fillText(d.inviteUrl.replace(/^https?:\/\//, ''), W / 2, H - 32);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))), 'image/png');
  });
}

// Measure-only word wrap, so the card's height can be decided before anything
// is drawn. A single word wider than the line (a URL, or a script that doesn't
// space-separate) is broken by character rather than overflowing the panel.
function layoutLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = '';
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
  return out + '…';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
