import { useEffect, useState } from 'react';

type Props = {
  deadline: number; // ms epoch
  totalMs: number;
  size?: number;
  label?: string;
};

export function CountdownRing({ deadline, totalMs, size = 110, label }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, deadline - now);
  const pct = Math.max(0, Math.min(1, remainingMs / totalMs));
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(var(--accent) ${pct * 100}%, var(--border) ${pct * 100}%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 7
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--screen-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: size * 0.26, color: 'var(--accent)' }}>
          {seconds}
        </span>
        {label && <span style={{ fontSize: 9, color: 'var(--text-5)' }}>{label}</span>}
      </div>
    </div>
  );
}
