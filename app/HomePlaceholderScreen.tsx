import { Text, View } from 'react-native';

/**
 * Temporary scaffold screen proving navigation, NativeWind, and the app
 * shell render correctly. This is not a feature screen — replace it with
 * the real Home feature in a later phase (see docs/implementation and
 * self-plan.md Phase 11).
 */
export function HomePlaceholderScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-semibold text-gray-900">Kids Discovery</Text>
      <Text className="mt-2 text-sm text-gray-500">Project foundation — Phase 1</Text>
    </View>
  );
}
