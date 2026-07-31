const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo disables inlineRequires by default, which breaks Worklets' native
// initialization order and crashes the app on launch (SIGSEGV during
// Worklets' toOptimizedObject install). See
// https://github.com/software-mansion/react-native-reanimated/issues/9445
config.transformer.getTransformOptions = async () => ({
  transform: { inlineRequires: true },
});

module.exports = withNativeWind(config, { input: './global.css' });
