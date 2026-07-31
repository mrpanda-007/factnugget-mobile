import 'react-native-gesture-handler';
import '../global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

import { AppProviders } from '@providers/AppProviders';
import { RootNavigator } from '@navigation/RootNavigator';
import { useExplorerStore } from '@store/useExplorerStore';
import { useUIStore } from '@store/useUIStore';

/**
 * App-level composition root (docs/implementation/02-folder-structure.md).
 * No screens or business logic live here — only provider/navigation wiring.
 *
 * First paint waits on useFonts() (docs/design/00-design-system.md commits to
 * Fredoka/Nunito everywhere, no system-font fallback) and then on
 * useExplorerStore's SQLite hydration, so RootNavigator's Onboarding-vs-Main
 * decision (docs/design/01-screen-map.md) never flashes the wrong flow.
 */
export default function App() {
  const setAppShellReady = useUIStore((state) => state.setAppShellReady);
  const isHydrated = useExplorerStore((state) => state.isHydrated);
  const hydrate = useExplorerStore((state) => state.hydrate);

  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && isHydrated) {
      setAppShellReady(true);
    }
  }, [fontsLoaded, isHydrated, setAppShellReady]);

  if (!fontsLoaded || !isHydrated) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AppProviders>
  );
}
