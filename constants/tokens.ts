/**
 * Design tokens per docs/design/00-design-system.md (the approved design system —
 * see docs/implementation/01-project-architecture.md "Theme & Design Tokens" for
 * why this file exists at all).
 *
 * Color/spacing/radius/font values here are mirrored in `tailwind.config.js` so
 * both NativeWind classNames and plain JS consumers (Reanimated, react-native-svg
 * fills, expo-linear-gradient `colors` arrays, dynamic per-world theming) read the
 * same palette. The two files can't share a single source directly — Tailwind's
 * config loader and the app's Metro/TypeScript bundler are different toolchains —
 * so keep them in sync by hand. If you change a value here, change it there too.
 */

// ---------------------------------------------------------------------------
// Color system
// ---------------------------------------------------------------------------

export const colors = {
  cream: '#FFFBF3',
  sand: '#F2E4CE',
  surface: '#FFFFFF',

  ink900: '#2B2540',
  ink600: '#5B5570',
  ink400: '#8B86A0',

  ocean50: '#EAF6FF',
  ocean100: '#CFEBFC',
  ocean300: '#7CCBEE',
  ocean500: '#3AAAE1',
  ocean700: '#1F7FB8',
  ocean900: '#134D73',

  explorerGreen50: '#EAFBF3',
  explorerGreen300: '#8DE0C0',
  explorerGreen500: '#3FBF8F',
  explorerGreen700: '#268F68',

  sunshine50: '#FFF6E0',
  sunshine300: '#FFDE8A',
  sunshine500: '#FFC94A',
  sunshine700: '#E0A424',

  coral50: '#FFEFE9',
  coral300: '#FFB79E',
  coral500: '#FF8B66',
  coral700: '#E5623B',

  cosmic50: '#F4EEFF',
  cosmic300: '#DCC8FA',
  cosmic500: '#C9B6F2',
  cosmic700: '#8F6FD1',
  cosmic900: '#4B3B7A',
} as const;

export const semanticColors = {
  background: colors.cream,
  surface: colors.surface,
  textPrimary: colors.ink900,
  textSecondary: colors.ink600,
  textTertiary: colors.ink400,
  textInverse: '#FFFFFF',
  success: colors.explorerGreen500,
  border: colors.sand,
} as const;

// ---------------------------------------------------------------------------
// World themes — docs/design/00-design-system.md#world-themes
// ---------------------------------------------------------------------------

export type WorldId = 'ocean' | 'space' | 'dinosaur' | 'animal' | 'earth';

export interface WorldTheme {
  id: WorldId;
  label: string;
  emoji: string;
  primary: string;
  secondary: string;
  tint: string;
  background: string;
}

export const worldThemes: Record<WorldId, WorldTheme> = {
  ocean: {
    id: 'ocean',
    label: 'Ocean World',
    emoji: '🌊',
    primary: colors.ocean500,
    secondary: colors.explorerGreen500,
    tint: colors.ocean50,
    background: colors.ocean100,
  },
  space: {
    id: 'space',
    label: 'Space World',
    emoji: '🚀',
    primary: colors.cosmic700,
    secondary: colors.sunshine500,
    tint: colors.cosmic50,
    // `background` is the far end of every WorldBackground gradient, and
    // `textPrimary` (ink900) sits on top of it — so it has to stay light
    // enough to keep 4.5:1. cosmic900 reads as a gorgeous deep-space wash but
    // made card text illegible; cosmic500 keeps the purple identity and the
    // contrast floor. Reintroduce a true dark space wash only alongside a
    // per-world text color.
    background: colors.cosmic500,
  },
  dinosaur: {
    id: 'dinosaur',
    label: 'Dinosaur World',
    emoji: '🦖',
    primary: colors.explorerGreen500,
    secondary: colors.coral500,
    tint: colors.sand,
    background: colors.explorerGreen50,
  },
  animal: {
    id: 'animal',
    label: 'Animal World',
    emoji: '🐘',
    primary: colors.sunshine500,
    secondary: colors.coral500,
    tint: colors.sand,
    background: colors.sunshine50,
  },
  earth: {
    id: 'earth',
    label: 'Earth World',
    emoji: '🌎',
    primary: colors.ocean500,
    secondary: colors.explorerGreen500,
    tint: colors.sand,
    background: colors.ocean50,
  },
} as const;

// ---------------------------------------------------------------------------
// Ollie's Discovery Island — first-app-open scene palette
// ---------------------------------------------------------------------------

/**
 * The muted storybook palette for the first-open scene
 * (features/onboarding — "wide establishing shot, cinematic push-in").
 *
 * Deliberately NOT mirrored into `tailwind.config.js`, unlike `colors` above:
 * every value here is consumed as a react-native-svg `fill`/`stroke` or a plain
 * style object, never as a className, so mirroring would add sync burden for no
 * consumer. `ink` re-uses ink900 so the scene's line work matches app-wide text.
 */
export const islandScene = {
  /** Far sky, top of frame — soft powder blue. */
  sky: '#B9D9EC',
  /** Sky at the mid band, where the title sits. */
  skyMid: '#DCEBF3',
  /** Very pale blue just above the horizon haze. */
  skyLight: '#EFF6FA',
  /** Warm off-white parchment the sky dissolves into at the horizon. */
  paper: colors.cream,
  cloud: '#FFFDF7',
  grass: '#A9CE9F',
  grassDark: '#6E9B70',
  grassDeep: '#4F7757',
  sand: '#E9D8B8',
  sandDark: '#C9B08A',
  ollieAccent: '#F4B183',
  ollieAccentDark: '#DC9260',
  ollieBelly: '#FDE7CF',
  ollieCheek: colors.coral300,
  /** Deep warm charcoal — the scene's only "line" color. Never pure black. */
  ink: colors.ink900,
  inkSoft: colors.ink600,
} as const;

// ---------------------------------------------------------------------------
// Spacing / radius / elevation / touch targets
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

/** Warm-tinted shadows (from ink900, never pure black) — not expressible as a NativeWind className, so these stay plain style objects. */
export const elevation = {
  resting: {
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  floating: {
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

export const touchTargets = {
  primary: 56,
  secondary: 44,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Semantic names mapped to the exact font keys loaded via useFonts() in
 * App.tsx. Components should reference these, never the raw
 * "Fredoka_600SemiBold"-style string, so a weight change is a one-line edit.
 */
export const fontFamily = {
  displaySemiBold: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  bodyRegular: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyExtraBold: 'Nunito_800ExtraBold',
} as const;

export const typeScale = {
  displayXl: { fontFamily: fontFamily.displayBold, fontSize: 34, lineHeight: 41 },
  displayLg: { fontFamily: fontFamily.displaySemiBold, fontSize: 28, lineHeight: 35 },
  displayMd: { fontFamily: fontFamily.displaySemiBold, fontSize: 22, lineHeight: 29 },
  bodyLg: { fontFamily: fontFamily.bodySemiBold, fontSize: 18, lineHeight: 25 },
  bodyMd: { fontFamily: fontFamily.bodyRegular, fontSize: 16, lineHeight: 23 },
  bodySm: { fontFamily: fontFamily.bodyRegular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.bodyExtraBold, fontSize: 15, lineHeight: 18 },
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const animationDurations = {
  fast: 150,
  base: 250,
  slow: 400,
  celebration: 600,
  ambient: 4000,
} as const;

export type AnimationDuration = keyof typeof animationDurations;

/** Reanimated withSpring() configs — docs/design/00-design-system.md#motion-tokens */
export const springs = {
  gentle: { damping: 16, stiffness: 120, mass: 1 },
  bouncy: { damping: 10, stiffness: 160, mass: 1 },
  snappy: { damping: 20, stiffness: 220, mass: 0.9 },
} as const;
