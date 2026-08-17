// Renders the share card entirely client-side (canvas) — per SPEC.md, no
// server round-trip and no chat transcript on the image.
export async function renderShareCard(opts: {
  outcome: 'correct' | 'wrong' | 'no_guess';
  scoreDelta: number;
  coinDelta: number;
  rank: number;
}): Promise<Blob> {
  const size = 800;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#7c5cff';
  ctx.beginPath();
  ctx.arc(size / 2, 260, 130, 0, Math.PI * 2);
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#eef0ff';
  ctx.font = '700 40px Fredoka, sans-serif';
  const headline = opts.outcome === 'correct' ? 'I caught the bot!' : 'The bot fooled me';
  wrapText(ctx, headline, size / 2, 300, 640, 48);

  ctx.font = '800 30px Fredoka, sans-serif';
  ctx.fillStyle = '#c5c8dd';
  const scoreText = `${opts.scoreDelta >= 0 ? '+' : ''}${opts.scoreDelta} score  ·  ${opts.coinDelta >= 0 ? '+' : ''}${opts.coinDelta} coins`;
  ctx.fillText(scoreText, size / 2, 420);

  ctx.font = '600 22px Nunito, sans-serif';
  ctx.fillStyle = '#7d84a8';
  ctx.fillText(`Leaderboard rank #${opts.rank}`, size / 2, 470);

  ctx.font = '700 30px Fredoka, sans-serif';
  ctx.fillStyle = '#7c5cff';
  ctx.fillText('BOTCHA', size / 2, size - 90);
  ctx.font = '400 16px Nunito, sans-serif';
  ctx.fillStyle = '#565a72';
  ctx.fillText('1-3 bots at the table. Find them.', size / 2, size - 60);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))), 'image/png');
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, curY);
}
