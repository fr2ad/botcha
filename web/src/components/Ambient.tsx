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

// A real burst, not a drizzle: dense spread, launched together within a third
// of a second, gone in under 2.5s — a slow six-piece infinite loop read as
// ambient rain rather than a win. `ease-in` gives the fall itself a gravity
// feel (accelerating) instead of the constant speed `linear` gave it.
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: `${4 + i * 4.3}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + (i % 3) * 2,
  dur: 1.6 + (i % 5) * 0.18,
  delay: (i % 7) * 0.05
}));

export function Confetti() {
  return (
    <div className="ambient" aria-hidden>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: c.left,
            width: c.size,
            height: c.size * 1.6,
            background: c.color,
            animation: `fall ${c.dur}s cubic-bezier(0.55,0.06,0.68,0.19) ${c.delay}s both`
          }}
        />
      ))}
    </div>
  );
}
