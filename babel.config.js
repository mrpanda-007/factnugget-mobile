module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
          alias: {
            '@app': './app',
            '@assets': './assets',
            '@components': './components',
            '@features': './features',
            '@hooks': './hooks',
            '@navigation': './navigation',
            '@providers': './providers',
            '@repositories': './repositories',
            '@services': './services',
            '@store': './store',
            '@database': './database',
            '@types': './types',
            '@constants': './constants',
            '@utils': './utils',
            '@animations': './animations',
            '@firebase-config': './firebase',
          },
        },
      ],
      // Reanimated/Worklets plugin must always run last.
      'react-native-worklets/plugin',
    ],
  };
};
