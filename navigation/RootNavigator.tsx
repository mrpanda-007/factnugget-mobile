import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabNavigator } from '@navigation/MainTabNavigator';
import { OnboardingNavigator } from '@navigation/OnboardingNavigator';
import type { RootStackParamList } from '@navigation/types';
import { useExplorerStore } from '@store/useExplorerStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Branches on whether a local explorer identity exists yet
 * (docs/design/01-screen-map.md "Root Decision Tree"). App.tsx hydrates
 * useExplorerStore from SQLite before this ever mounts, so `identity` here
 * always reflects the real persisted value — never a flash of the wrong flow.
 */
export function RootNavigator() {
  const identity = useExplorerStore((state) => state.identity);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {identity ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Stack.Navigator>
  );
}
