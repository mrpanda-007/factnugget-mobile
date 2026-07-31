import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ExplorerIdentityScreen } from '@features/onboarding/screens/ExplorerIdentityScreen';
import { WelcomeScreen } from '@features/onboarding/screens/WelcomeScreen';
import type { OnboardingStackParamList } from '@navigation/types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/** docs/design/01-screen-map.md — shown exactly once, before any local identity exists. */
export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ExplorerIdentity" component={ExplorerIdentityScreen} />
    </Stack.Navigator>
  );
}
