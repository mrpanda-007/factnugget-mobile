import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootTabNavigator } from '@navigation/RootTabNavigator';
import type { RootStackParamList } from '@navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root native stack navigator. Currently holds only the tab navigator —
 * modal/detail screens are pushed onto this stack as features are built.
 */
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Root" component={RootTabNavigator} />
    </Stack.Navigator>
  );
}
