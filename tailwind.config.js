/**
 * Design tokens per docs/design/00-design-system.md. Values here must stay in
 * sync with constants/tokens.ts by hand — see that file's header comment for
 * why the two can't share a single source (different toolchains: PostCSS
 * config loading vs Metro/TypeScript).
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
    extend: {
      colors: {
        cream: '#FFFBF3',
        sand: '#F2E4CE',
        surface: '#FFFFFF',
        background: '#FFFBF3',
        border: '#F2E4CE',
        ink: {
          900: '#2B2540',
          600: '#5B5570',
          400: '#8B86A0',
        },
        ocean: {
          50: '#EAF6FF',
          100: '#CFEBFC',
          300: '#7CCBEE',
          500: '#3AAAE1',
          700: '#1F7FB8',
          900: '#134D73',
        },
        'explorer-green': {
          50: '#EAFBF3',
          300: '#8DE0C0',
          500: '#3FBF8F',
          700: '#268F68',
        },
        sunshine: {
          50: '#FFF6E0',
          300: '#FFDE8A',
          500: '#FFC94A',
          700: '#E0A424',
        },
        coral: {
          50: '#FFEFE9',
          300: '#FFB79E',
          500: '#FF8B66',
          700: '#E5623B',
        },
        cosmic: {
          50: '#F4EEFF',
          300: '#DCC8FA',
          500: '#C9B6F2',
          700: '#8F6FD1',
          900: '#4B3B7A',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        sm: '12px',
        md: '20px',
        lg: '28px',
        xl: '36px',
        pill: '999px',
      },
      fontFamily: {
        'fredoka-semibold': ['Fredoka_600SemiBold'],
        'fredoka-bold': ['Fredoka_700Bold'],
        'nunito-regular': ['Nunito_400Regular'],
        'nunito-semibold': ['Nunito_600SemiBold'],
        'nunito-extrabold': ['Nunito_800ExtraBold'],
      },
      fontSize: {
        'display-xl': ['34px', { lineHeight: '41px' }],
        'display-lg': ['28px', { lineHeight: '35px' }],
        'display-md': ['22px', { lineHeight: '29px' }],
        'body-lg': ['18px', { lineHeight: '25px' }],
        'body-md': ['16px', { lineHeight: '23px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        label: ['15px', { lineHeight: '18px' }],
      },
    },
  },
  plugins: [],
};
