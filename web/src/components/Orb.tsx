import type { ReactNode } from 'react';

// Player avatars: 15 drawn faces, not emoji. Each is a lit gradient disc with a
// dark geometric face cut into it — the same construction as the design's
// avatar grid, extended to 15. The server stores only the id
// (server/src/config.ts AVATAR_POOL); this file owns what each one looks like.
// Keep the two lists in sync.

const INK = '#14162a';
const EDGE = 'rgba(255,255,255,.2)';

// Shared eye positions in the 64-unit box, so faces read as one family.
const LX = 21;
const RX = 43;
const EY = 28;

function Eye({ x, y = EY, r = 5 }: { x: number; y?: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={INK} stroke={EDGE} strokeWidth="1" />;
}

function Diamond({ x, y = EY, s = 9 }: { x: number; y?: number; s?: number }) {
  return (
    <rect
      x={x - s / 2}
      y={y - s / 2}
      width={s}
      height={s}
      rx="2"
      fill={INK}
      stroke={EDGE}
      strokeWidth="1"
      transform={`rotate(45 ${x} ${y})`}
    />
  );
}

function Bar({ x, y = EY, w = 15, h = 6, rot = 0 }: { x: number; y?: number; w?: number; h?: number; rot?: number }) {
  return (
    <rect
      x={x - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      rx={h / 2}
      fill={INK}
      stroke={EDGE}
      strokeWidth="1"
      transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
    />
  );
}

function Box({ x, y = EY, w = 10, h = 10, rx = 2 }: { x: number; y?: number; w?: number; h?: number; rx?: number }) {
  return (
    <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={rx} fill={INK} stroke={EDGE} strokeWidth="1" />
  );
}

function Cross({ x, y = EY, s = 5 }: { x: number; y?: number; s?: number }) {
  return (
    <g stroke={INK} strokeWidth="3.4" strokeLinecap="round">
      <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
      <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} />
    </g>
  );
}

function Arc({ x, y = EY, w = 12, down = true }: { x: number; y?: number; w?: number; down?: boolean }) {
  const h = down ? 6 : -6;
  return (
    <path
      d={`M ${x - w / 2} ${y} Q ${x} ${y + h} ${x + w / 2} ${y}`}
      fill="none"
      stroke={INK}
      strokeWidth="3.4"
      strokeLinecap="round"
    />
  );
}

// hue is the disc color; face is drawn in a 0 0 64 64 viewBox.
const FACES: Record<string, { hue: number; face: ReactNode }> = {
  dot: {
    hue: 0,
    face: (
      <>
        <Eye x={LX} />
        <Eye x={RX} />
      </>
    )
  },
  diamond: {
    hue: 24,
    face: (
      <>
        <Diamond x={LX} />
        <Diamond x={RX} />
      </>
    )
  },
  bar: {
    hue: 48,
    face: (
      <>
        <Bar x={LX} />
        <Bar x={RX} />
      </>
    )
  },
  square: {
    hue: 72,
    face: (
      <>
        <Box x={LX} />
        <Box x={RX} />
      </>
    )
  },
  cyclops: {
    hue: 96,
    face: (
      <>
        <circle cx="32" cy="30" r="11" fill={INK} stroke={EDGE} strokeWidth="1" />
        <circle cx="32" cy="30" r="3.5" fill="oklch(88% .17 96)" />
      </>
    )
  },
  brow: {
    hue: 120,
    face: (
      <>
        <Bar x={LX} y={18} w={13} h={3} rot={-10} />
        <Bar x={RX} y={18} w={13} h={3} rot={10} />
        <Eye x={LX} y={30} />
        <Eye x={RX} y={30} />
      </>
    )
  },
  capsule: {
    hue: 144,
    face: (
      <>
        <Box x={LX} w={8} h={17} rx={4} />
        <Box x={RX} w={8} h={17} rx={4} />
      </>
    )
  },
  trio: {
    hue: 168,
    face: (
      <>
        <Eye x={32} y={16} r={4.5} />
        <Eye x={LX} y={32} r={4.5} />
        <Eye x={RX} y={32} r={4.5} />
      </>
    )
  },
  visor: {
    hue: 192,
    face: (
      <>
        <Box x={LX} y={27} w={9} h={9} />
        <Box x={RX} y={27} w={9} h={9} />
        {/* Crosses the eyes — below them it just reads as a moustache. */}
        <rect x="8" y="26" width="48" height="4" rx="2" fill="rgba(20,22,42,.75)" />
      </>
    )
  },
  wedge: {
    hue: 216,
    face: (
      <>
        <Bar x={LX} w={14} h={6} rot={-14} />
        <Bar x={RX} w={14} h={6} rot={14} />
      </>
    )
  },
  scan: {
    hue: 240,
    face: (
      <>
        <Bar x={32} w={36} h={7} />
        <circle cx="24" cy={EY} r="1.6" fill="oklch(90% .15 240)" />
      </>
    )
  },
  cross: {
    hue: 264,
    face: (
      <>
        <Cross x={LX} />
        <Cross x={RX} />
      </>
    )
  },
  sleepy: {
    hue: 288,
    face: (
      <>
        <Arc x={LX} />
        <Arc x={RX} />
      </>
    )
  },
  pip: {
    hue: 312,
    face: (
      <>
        <Eye x={LX} r={6} />
        <Diamond x={RX} s={8} />
      </>
    )
  },
  crown: {
    hue: 336,
    face: (
      <>
        <circle cx="32" cy="12" r="3.5" fill={INK} stroke={EDGE} strokeWidth="1" />
        <line x1="32" y1="15" x2="32" y2="21" stroke={INK} strokeWidth="2" />
        <Eye x={LX} y={30} />
        <Eye x={RX} y={30} />
      </>
    )
  }
};

export const AVATAR_POOL = Object.keys(FACES);

// Pre-2026 accounts stored an emoji instead of an id. Those still render (as
// the emoji, on a hashed hue) rather than showing a blank disc.
function legacyHue(avatar: string) {
  return [...avatar].reduce((h, c) => (h + c.codePointAt(0)!) % 360, 0);
}

type Props = {
  avatar: string;
  size?: number;
  selected?: boolean;
  ring?: string;
  onClick?: () => void;
};

export function Orb({ avatar, size = 64, selected = false, ring, onClick }: Props) {
  const spec = FACES[avatar];
  const hue = spec ? spec.hue : legacyHue(avatar);
  const border = ring ?? (selected ? 'var(--accent)' : null);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={onClick ? selected : undefined}
      aria-label={spec ? `Avatar ${avatar}` : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        padding: 0,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        background: `radial-gradient(circle at 35% 30%, oklch(76% .15 ${hue}), oklch(52% .16 ${hue}))`,
        boxShadow: [
          border ? `0 0 0 3px ${border}` : null,
          `0 0 ${selected ? 30 : 22}px oklch(72% .16 ${hue} / ${selected ? 0.75 : 0.55})`,
          'inset 0 -6px 14px rgba(0,0,0,.2)'
        ]
          .filter(Boolean)
          .join(','),
        transition: 'box-shadow .2s ease, transform .2s ease',
        transform: selected ? 'scale(1.06)' : undefined
      }}
    >
      {spec ? (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden focusable="false">
          {spec.face}
        </svg>
      ) : (
        avatar
      )}
    </button>
  );
}
