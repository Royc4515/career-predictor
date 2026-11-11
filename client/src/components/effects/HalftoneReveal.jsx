import { useEffect, useRef, useState } from 'react';
import { HalftoneCmyk } from '@paper-design/shaders-react';

// Press check: the portrait is first printed as coarse CMYK halftone dots
// (Paper Shaders, WebGL2), the screen tightens until the dots are finer than
// the eye can separate, then the plate lifts off to reveal the photograph.
// Hold on the coarse screen long enough to read it as print, then tighten.
const HOLD_MS = 450;
const TIGHTEN_MS = 1900;
const LIFT_MS = 650;
// Calibrated: at 1 the screen dissolves into blurry blobs; ~0.55 is the
// coarsest setting that still reads unmistakably as printed dots.
const SIZE_FROM = 0.55;
const SIZE_TO = 0.02;

// Ease-in-out cubic: the coarse dots linger, the middle moves, the last
// stretch settles gently into register.
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Overlay that plays once over an already-decoded image, then calls onDone.
 * The caller keeps the real <img> hidden until onDone fires.
 */
// pace scales the whole run: 1 is the hero's full press check; a row of
// covers (the back-issue rack) uses a quicker pass so it finishes together.
export default function HalftoneReveal({ image, onDone, pace = 1 }) {
  const [size, setSize] = useState(SIZE_FROM);
  const [lifting, setLifting] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let frame;
    let liftTimer;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(Math.max(now - start - HOLD_MS * pace, 0) / (TIGHTEN_MS * pace), 1);
      setSize(SIZE_FROM + (SIZE_TO - SIZE_FROM) * ease(t));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setLifting(true);
        liftTimer = setTimeout(() => done.current?.(), LIFT_MS * pace);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(liftTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10"
      style={{ opacity: lifting ? 0 : 1, transition: `opacity ${LIFT_MS * pace}ms ease-out` }}
    >
      <HalftoneCmyk
        image={image}
        fit="cover"
        size={size}
        type="ink"
        colorBack="#f3f4f1"
        colorC="#00a8e8"
        colorM="#e8317f"
        colorY="#f6e24a"
        colorK="#13203a"
        contrast={1.1}
        softness={0.8}
        gridNoise={0.25}
        grainOverlay={0.08}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
