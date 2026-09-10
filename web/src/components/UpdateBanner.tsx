import { useEffect, useState } from 'react';

// The installed-PWA case this exists for: index.html is fetched fresh on
// every full load (sw.js is a deliberate no-op, see its own comment), but a
// tab/standalone window left open across a deploy keeps running whatever
// bundle it already loaded — nothing tells it a new one exists. Polling the
// document for its hashed script tag and comparing to what's currently
// mounted is the whole update signal; no build-time version file needed.
const BUNDLE_RE = /\/assets\/index-[\w-]+\.js/;
const POLL_MS = 5 * 60 * 1000;

function currentBundle(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script?.getAttribute('src') ?? null;
}

export function UpdateBanner() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const known = currentBundle();
    if (!known) return; // dev server serves an unbundled src/main.tsx — nothing to compare

    async function check() {
      try {
        const res = await fetch('/', { cache: 'no-store' });
        const html = await res.text();
        const latest = html.match(BUNDLE_RE)?.[0];
        if (latest && latest !== known) setAvailable(true);
      } catch {
        // offline or a blip — next poll tries again
      }
    }

    const id = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!available) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 14,
        right: 14,
        bottom: 'calc(14px + env(safe-area-inset-bottom))',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--panel)',
        border: '1px solid rgba(124,110,246,.35)',
        borderRadius: 16,
        padding: '10px 10px 10px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,.5)',
        animation: 'sheetUp .3s var(--ease-sheet) both'
      }}
    >
      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-2)', fontWeight: 700 }}>
        A new version of Botcha is ready.
      </span>
      <button
        className="btn-primary"
        style={{ width: 'auto', flexShrink: 0, padding: '8px 16px', fontSize: 12.5, boxShadow: 'none' }}
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}
