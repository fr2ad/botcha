import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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

// Hand-authored Lottie asset (public/confetti-lottie.json): two cannon
// bursts plus a center flash, exported at 1827x2436 — fetched at mount
// (not bundled) since it's a one-shot 64KB asset only needed on a win.
export function Confetti() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: import('lottie-web').AnimationItem | undefined;
    let cancelled = false;
    // Dynamic import — lottie-web (~165KB) is only needed for this one-shot
    // win screen, not worth adding to every page's initial bundle.
    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: '/confetti-lottie.json',
        rendererSettings: {
          // The source asset is a tall 1827x2436 canvas that doesn't match a
          // phone's aspect ratio, so it letterboxes either way — default
          // centering ('xMidYMid') put the burst around the vertical middle.
          // Anchoring to the top instead keeps it up near the result title.
          preserveAspectRatio: 'xMidYMin meet'
        }
      });
    });
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  // Portaled to <body>, not rendered in place: .screen plays a transform-
  // based entrance animation on mount (screenIn), and a `position: fixed`
  // descendant of an element with an active transform is fixed relative to
  // *that element*, not the viewport — it used to get clipped/repositioned
  // to a small band inside .screen instead of covering the real screen.
  // Escaping to body via a portal sidesteps that entirely.
  return createPortal(
    <div ref={containerRef} aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />,
    document.body
  );
}
