import type { PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryProvider } from '@providers/QueryProvider';

/**
 * Composes every cross-cutting provider the app shell needs. Order matters:
 * GestureHandlerRootView must wrap everything (react-native-gesture-handler
 * requirement), SafeAreaProvider must wrap anything using safe-area insets.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>{children}</QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
