/**
 * The motion budget.
 *
 * Framer Motion variants were previously written inline at each call site with
 * whatever duration and delay seemed right, so entrances across the app ran at
 * five different speeds. Everything animates on two durations and one easing.
 *
 * `prefers-reduced-motion` is honoured globally in index.css, which zeroes
 * transition and animation durations; these variants also collapse their travel
 * so nothing slides when the user has asked for stillness.
 */

const EASE = [0.2, 0.7, 0.3, 1]

export const DUR = { ui: 0.12, enter: 0.32 }

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** Standard entrance. Staggered lists pass an index, capped so long lists
 *  do not take a second and a half to finish arriving. */
export const enter = (index = 0) => ({
  initial: { opacity: 0, y: reduced ? 0 : 8 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: DUR.enter,
    ease: EASE,
    delay: Math.min(index * 0.035, 0.28),
  },
})

/** A turn arriving in the transcript, from the side that is speaking. */
export const turnEnter = (side) => ({
  initial: { opacity: 0, x: reduced ? 0 : side === "defence" ? 12 : -12 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: DUR.enter, ease: EASE },
})

export const press = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } }
