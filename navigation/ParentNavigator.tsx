import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PackPreviewScreen } from '@features/parent/screens/PackPreviewScreen';
import { ParentAreaScreen } from '@features/parent/screens/ParentAreaScreen';
import type { ParentStackParamList } from '@navigation/types';

const Stack = createNativeStackNavigator<ParentStackParamList>();

/** docs/design/01-screen-map.md — the "Parent Area" tab's stack. Always self-gates in ParentAreaScreen. */
export function ParentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Area" component={ParentAreaScreen} />
      <Stack.Screen name="PackPreview" component={PackPreviewScreen} />
    </Stack.Navigator>
  );
}
