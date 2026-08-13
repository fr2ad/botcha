// B + scanning eye + TCHA. The eye is the whole brand — keep the pupil moving.
export function Wordmark({ size = 46 }: { size?: number }) {
  const eye = size * 0.86;
  const pupil = Math.max(3, size * 0.24);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.08,
        fontFamily: 'var(--font-head)',
        fontWeight: 700,
        fontSize: size,
        letterSpacing: size * 0.065
      }}
    >
      B
      <span
        style={{
          display: 'inline-flex',
          width: eye,
          height: eye,
          borderRadius: '50%',
          border: `${Math.max(2, size * 0.13)}px solid var(--accent)`,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 ${size * 0.44}px rgba(124,110,246,.6)`
        }}
      >
        <span
          style={{
            width: pupil,
            height: pupil,
            borderRadius: '50%',
            background: '#fff',
            animation: 'eyeScan 3s ease-in-out infinite'
          }}
        />
      </span>
      TCHA
    </div>
  );
}
