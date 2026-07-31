/**
 * Design tokens (colors, spacing, radius, typography) are intentionally left as
 * Tailwind's defaults for now — no Design System document exists yet in
 * docs/implementation/ (see readme.md "Not yet written"). This file is the
 * mechanism NativeWind needs; replace `theme.extend` with the real palette once
 * that document lands. Do not hardcode brand values elsewhere in the meantime.
 */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './navigation/**/*.{js,jsx,ts,tsx}',
    './providers/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
