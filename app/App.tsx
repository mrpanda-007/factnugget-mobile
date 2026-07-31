import 'react-native-gesture-handler';
import '../global.css';

import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@providers/AppProviders';
import { RootNavigator } from '@navigation/RootNavigator';
import { useUIStore } from '@store/useUIStore';

/**
 * App-level composition root (docs/implementation/02-folder-structure.md).
 * No screens or business logic live here — only provider/navigation wiring.
 */
export default function App() {
  const setAppShellReady = useUIStore((state) => state.setAppShellReady);

  useEffect(() => {
    setAppShellReady(true);
  }, [setAppShellReady]);

  return (
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AppProviders>
  );
}
