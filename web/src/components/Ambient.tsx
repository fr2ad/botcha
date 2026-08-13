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

const CONFETTI = [
  { left: '12%', color: 'var(--accent)', dur: 4, delay: 0 },
  { left: '26%', color: 'var(--green)', dur: 5, delay: 0.6 },
  { left: '44%', color: 'var(--amber)', dur: 4.4, delay: 1.2 },
  { left: '61%', color: 'var(--pink)', dur: 5.2, delay: 0.3 },
  { left: '76%', color: 'var(--blue)', dur: 4.7, delay: 1.6 },
  { left: '89%', color: 'var(--accent-2)', dur: 5.5, delay: 0.9 }
];

export function Confetti() {
  return (
    <div className="ambient" aria-hidden>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="confetti"
          style={{ left: c.left, background: c.color, animation: `fall ${c.dur}s linear ${c.delay}s infinite` }}
        />
      ))}
    </div>
  );
}
