// One source for easing so every animation in the app shares a voice.
// EASE_OUT for things entering or responding to input; EASE_IN_OUT for
// things already on screen that move from one place to another.
export const EASE_OUT = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT = [0.77, 0, 0.175, 1];

// Entrance from slightly below. Animating a `transform` string (not the y
// shorthand) lets Motion hand the animation to the compositor, which matters
// on page load when the main thread is busy. MotionConfig reducedMotion
// drops the movement and keeps the fade for readers who ask for less motion.
export function rise(distance = 10) {
  return {
    initial: { opacity: 0, transform: `translateY(${distance}px)` },
    animate: { opacity: 1, transform: 'translateY(0px)' },
  };
}
