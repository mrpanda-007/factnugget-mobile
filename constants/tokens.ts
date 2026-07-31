/**
 * Design tokens per docs/implementation/01-project-architecture.md ("Theme & Design Tokens").
 *
 * Color, spacing, radius, and typography tokens are consumed as Tailwind
 * classes via NativeWind — see tailwind.config.js. This file holds the
 * tokens that can't be expressed as a className, because Reanimated needs
 * plain JS values (e.g. `withTiming(value, { duration })`).
 *
 * No Design System document exists yet (see readme.md), so these are
 * placeholder values, not an approved brand identity. Replace once that
 * document is written — do not hardcode animation durations elsewhere in
 * the meantime.
 */
export const animationDurations = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export type AnimationDuration = keyof typeof animationDurations;
