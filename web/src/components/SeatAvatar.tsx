// In-game seat identity: a dark well with a colored ring and the code name's
// initial — never a filled color disc, and never the player's emoji (that would
// leak the roster mapping the game is built on hiding). See DESIGN.md §5.
type Props = {
  codeName: string;
  color: string;
  size?: number;
  ringWidth?: number;
  glow?: boolean;
};

export function SeatAvatar({ codeName, color, size = 50, ringWidth = 2.5, glow = false }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--surface)',
        // color-mix, not a hex-alpha suffix: seat colors arrive as oklch()
        // strings from the server, which `${color}59` would corrupt.
        boxShadow: `0 0 0 ${ringWidth}px ${color}${
          glow ? `, 0 0 ${size * 0.4}px color-mix(in oklab, ${color} 35%, transparent)` : ''
        }`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-head)',
        fontWeight: 600,
        fontSize: size * 0.34,
        color,
        flexShrink: 0
      }}
    >
      {codeName.charAt(0)}
    </div>
  );
}
