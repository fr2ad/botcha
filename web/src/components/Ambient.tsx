// Decorative only — the violet wash plus a few drifting particles that keep a
// waiting screen from feeling frozen.
const DOTS = [
  { top: 110, left: 52, size: 4, color: 'var(--accent)', opacity: 0.55, anim: 'float1 7s' },
  { top: 190, right: 64, size: 3, color: 'var(--accent-2)', opacity: 0.4, anim: 'float2 9s' },
  { top: 330, left: 40, size: 3, color: 'var(--accent-2)', opacity: 0.35, anim: 'float2 11s' },
  { bottom: 230, right: 84, size: 4, color: 'var(--accent)', opacity: 0.4, anim: 'float1 8s' }
];

export function Ambient({ washTop = -120 }: { washTop?: number }) {
  return (
    <div className="ambient" aria-hidden>
      <div className="wash" style={{ top: washTop }} />
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="dot"
          style={{
            top: d.top,
            left: d.left,
            right: d.right,
            bottom: d.bottom,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: d.opacity,
            animation: `${d.anim} ease-in-out infinite`
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI_COLORS = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--pink)', 'var(--blue)', 'var(--accent-2)'];

// Two cannons firing from the bottom corners and converging toward top-middle
// (not a top-down drizzle, not two isolated corner puffs) before gravity
// pulls everything back down across the full screen — dx/rot vary per piece
// so the burst fans out instead of every piece tracing the same line; the
// shared cannonBurst keyframe (index.css) reads them off --dx/--rot custom
// properties. dx reaches well past screen center (.screen caps at 430px, so
// half-width is ~215px) so the two plumes visibly cross overhead.
function cannonPieces(side: 'left' | 'right', count: number) {
  const sign = side === 'left' ? 1 : -1;
  return Array.from({ length: count }, (_, i) => ({
    side,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 3) * 2,
    bottom: (i % 5) * 5,
    dx: sign * (150 + (i % 8) * 30),
    rot: sign * (360 + (i % 4) * 180),
    dur: 1.5 + (i % 6) * 0.15,
    delay: (i % 10) * 0.035
  }));
}

const CONFETTI = [...cannonPieces('left', 22), ...cannonPieces('right', 22)];

export function Confetti() {
  return (
    // position:fixed (not the shared .ambient, which is absolute relative to
    // .screen) — Result's content can grow taller than one viewport, and an
    // absolute-positioned burst sized for a single screen's-worth of travel
    // used to stop partway down that taller page and just sit there instead
    // of clipping away. Fixed always clips against the actual viewport.
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            top: 'auto',
            bottom: c.bottom,
            [c.side]: -10,
            width: c.size,
            height: c.size * 1.6,
            background: c.color,
            ['--dx' as string]: `${c.dx}px`,
            ['--rot' as string]: `${c.rot}deg`,
            animation: `cannonBurst ${c.dur}s cubic-bezier(0.16,0.84,0.44,1) ${c.delay}s both`
          }}
        />
      ))}
    </div>
  );
}
