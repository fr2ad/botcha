import { useEffect, useState } from 'react';

type Props = {
  deadline: number; // ms epoch
  totalMs: number;
  size?: number;
  color?: string;
  label?: string;
};

export function CountdownRing({ deadline, totalMs, size = 116, color = 'var(--accent)', label }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, deadline - now);
  const pct = Math.max(0, Math.min(1, remainingMs / totalMs)) * 100;
  const seconds = Math.ceil(remainingMs / 1000);
  const pad = Math.max(4, size * 0.06);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,.08) 0)`,
        boxShadow: `0 0 ${size * 0.28}px color-mix(in oklab, ${color} 30%, transparent)`,
        padding: pad,
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--bg-1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: size * 0.28, color }}>
          {seconds}
        </span>
        {label && (
          <span style={{ fontSize: 9.5, color: 'var(--text-5)', letterSpacing: 1 }}>{label}</span>
        )}
      </div>
    </div>
  );
}
