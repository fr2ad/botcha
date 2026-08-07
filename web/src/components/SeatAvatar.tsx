type Props = {
  letter: string;
  color: string;
  size?: number;
  ring?: boolean;
};

export function SeatAvatar({ letter, color, size = 44, ring = false }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.36,
        color: '#14162a',
        boxShadow: ring ? '0 0 0 3px var(--accent)' : undefined,
        flexShrink: 0
      }}
    >
      {letter}
    </div>
  );
}
