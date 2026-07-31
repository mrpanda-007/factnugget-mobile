const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Worklets needs its global setup to run before dependent modules evaluate;
// with eager loading that setup is skipped and Reanimated blows up. Enabling
// inlineRequires defers module loading enough for the setup to land. See
// https://github.com/software-mansion/react-native-reanimated/issues/9445
//
// Spread the default options rather than replacing them — the upstream
// snippet in that issue returns a bare `{ transform: { inlineRequires: true } }`,
// which silently drops Expo's `experimentalImportSupport: true` and changes
// module semantics well beyond the intended fix.
const getDefaultTransformOptions = config.transformer.getTransformOptions;
config.transformer.getTransformOptions = async (...args) => {
  const defaults = await getDefaultTransformOptions(...args);
  return {
    ...defaults,
    transform: { ...defaults.transform, inlineRequires: true },
  };
};

module.exports = withNativeWind(config, { input: './global.css' });
