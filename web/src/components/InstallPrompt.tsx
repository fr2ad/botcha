import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'botcha_install_dismissed';

// Chrome's install event. Not in lib.dom yet, so the shape is declared here.
type InstallEvent = Event & { prompt: () => Promise<void> };

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS never adopted display-mode; it sets this instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  // iPadOS 13+ claims to be a Mac, so the touch count is what gives it away.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

/**
 * Invites the player to keep Botcha on their home screen.
 *
 * Two different mechanisms behind one sheet: Android/Chrome hands us a real
 * install event we can fire, while iOS has no install API at all — Safari only
 * offers Share > Add to Home Screen, so there the sheet can only point at it.
 */
export function InstallPrompt({ gamesPlayed }: { gamesPlayed: number }) {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    // Asking before they've finished a game is asking a stranger to move in.
    if (gamesPlayed < 1 || isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    if (isIos()) {
      setShowIos(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault(); // Chrome's own mini-infobar; we show our own sheet instead.
      setDeferred(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [gamesPlayed]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDeferred(null);
    setShowIos(false);
  }

  if (!deferred && !showIos) return null;

  return (
    <>
      <div className="scrim" onClick={dismiss} />
      <div className="sheet" role="dialog" aria-label="Add Botcha to your home screen">
        <div className="sheet-grab" />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <img src="/icon-192.png" alt="" width={62} height={62} style={{ borderRadius: 16 }} />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 600,
            fontSize: 20,
            textAlign: 'center'
          }}
        >
          Keep Botcha one tap away
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)', marginTop: 8 }}>
          Add it to your home screen — full screen, no address bar.
        </div>

        {showIos ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '22px 0 4px' }}>
              <Step icon="hgi-share-08" text="Tap the Share button in Safari's toolbar" />
              <Step icon="hgi-add-square" text="Choose “Add to Home Screen”" />
            </div>
            <button className="btn-text" style={{ width: '100%', marginTop: 10 }} onClick={dismiss}>
              Got it
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-primary"
              style={{ marginTop: 22 }}
              onClick={() => {
                // One shot: Chrome discards the event once prompt() is called.
                deferred?.prompt();
                dismiss();
              }}
            >
              <i className="hgi-stroke hgi-download-04" style={{ fontSize: 16 }} />
              Add to home screen
            </button>
            <button className="btn-text" style={{ width: '100%' }} onClick={dismiss}>
              Not now
            </button>
          </>
        )}
      </div>
    </>
  );
}

function Step({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <i className={`hgi-stroke ${icon}`} style={{ fontSize: 16, color: 'var(--accent-2)' }} />
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{text}</span>
    </div>
  );
}
