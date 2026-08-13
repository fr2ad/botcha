// Player avatar. The server stores an emoji (server/src/config.ts AVATAR_POOL),
// so the orb wraps the emoji rather than replacing it with a drawn face — the
// gradient disc is what carries the design language. See DESIGN.md §5.
export const AVATAR_POOL = ['🦝', '🐑', '🐺', '🦄', '🦉', '🐴', '🐼', '🦔', '🐨', '🐱', '🐶', '🦊'];

function hueFor(emoji: string) {
  const i = AVATAR_POOL.indexOf(emoji);
  if (i !== -1) return i * 30;
  // Unknown emoji (older account, changed pool) still gets a stable color.
  return [...emoji].reduce((h, c) => (h + c.codePointAt(0)!) % 360, 0);
}

type Props = {
  avatar: string;
  size?: number;
  selected?: boolean;
  ring?: string;
  onClick?: () => void;
};

export function Orb({ avatar, size = 64, selected = false, ring, onClick }: Props) {
  const hue = hueFor(avatar);
  const border = ring ?? (selected ? 'var(--accent)' : null);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={onClick ? selected : undefined}
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
      {avatar}
    </button>
  );
}
