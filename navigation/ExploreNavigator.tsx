import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CompletionScreen } from '@features/explore/screens/CompletionScreen';
import { DiscoveryCardScreen } from '@features/explore/screens/DiscoveryCardScreen';
import { DiscoverySelectionScreen } from '@features/explore/screens/DiscoverySelectionScreen';
import { WorldHomeScreen } from '@features/explore/screens/WorldHomeScreen';
import type { ExploreStackParamList } from '@navigation/types';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

/** docs/design/01-screen-map.md — the "Explore" tab's stack. */
export function ExploreNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverySelection" component={DiscoverySelectionScreen} />
      <Stack.Screen name="WorldHome" component={WorldHomeScreen} />
      <Stack.Screen name="DiscoveryCard" component={DiscoveryCardScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
    </Stack.Navigator>
  );
}
