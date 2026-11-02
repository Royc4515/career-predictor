import { useRef } from 'react';
import { m, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { canHover } from '../../lib/capabilities';

const MAX_TILT = 9; // degrees; past ~10 the cover starts to read as a card trick
const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

/**
 * A printed object you can pick up: tilts toward the pointer on a spring,
 * with a gloss highlight that follows the light the way coated magazine stock
 * catches it. Mouse and trackpad only; touch and reduced motion get a flat,
 * fully readable cover.
 */
export default function TiltCard({ children, className = '' }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const rotateY = useSpring(useTransform(px, [0, 1], [-MAX_TILT, MAX_TILT]), SPRING);
  const rotateX = useSpring(useTransform(py, [0, 1], [MAX_TILT, -MAX_TILT]), SPRING);
  const lift = useSpring(useTransform(hover, [0, 1], [1, 1.025]), SPRING);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glareOpacity = useSpring(hover, SPRING);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.32), rgba(255,255,255,0) 55%)`;

  if (reduce || !canHover()) return <div className={className}>{children}</div>;

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  }

  return (
    <div className={className} style={{ perspective: 1100 }}>
      <m.div
        ref={ref}
        onPointerMove={onMove}
        onPointerEnter={() => hover.set(1)}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY, scale: lift, transformStyle: 'preserve-3d' }}
        className="relative will-change-transform"
      >
        {children}
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ backgroundImage: glare, opacity: glareOpacity }}
        />
      </m.div>
    </div>
  );
}
