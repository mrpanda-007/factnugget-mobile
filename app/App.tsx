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
import { Phase7SQLiteValidationScreen } from '@features/dev/Phase7SQLiteValidationScreen';
import { Phase8CommerceValidationScreen } from '@features/dev/Phase8CommerceValidationScreen';
import { Phase8IapValidationScreen } from '@features/dev/Phase8IapValidationScreen';
import { Phase8PurchaseValidationScreen } from '@features/dev/Phase8PurchaseValidationScreen';
import { Phase8RestoreValidationScreen } from '@features/dev/Phase8RestoreValidationScreen';
import { Phase9SyncQueueValidationScreen } from '@features/dev/Phase9SyncQueueValidationScreen';
import { Phase9FirestoreValidationScreen } from '@features/dev/Phase9FirestoreValidationScreen';
import { getParentAccountService } from '../application/sync/parentAccountRuntime';

const showPhase7Validation = __DEV__ && process.env.EXPO_PUBLIC_PHASE7_SQLITE_VALIDATION === 'true';
const showPhase8Validation =
  __DEV__ && process.env.EXPO_PUBLIC_PHASE8_COMMERCE_VALIDATION === 'true';
const showPhase8IapValidation = __DEV__ && process.env.EXPO_PUBLIC_PHASE8_IAP_VALIDATION === 'true';
const showPhase8PurchaseValidation =
  __DEV__ && process.env.EXPO_PUBLIC_PHASE8_PURCHASE_VALIDATION === 'true';
const showPhase8RestoreValidation =
  __DEV__ && process.env.EXPO_PUBLIC_PHASE8_RESTORE_VALIDATION === 'true';
const showPhase9SyncQueueValidation =
  __DEV__ && process.env.EXPO_PUBLIC_PHASE9_SYNC_QUEUE_VALIDATION === 'true';
const showPhase9FirestoreValidation =
  __DEV__ && process.env.EXPO_PUBLIC_PHASE9_FIRESTORE_VALIDATION === 'true';

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
  if (showPhase7Validation) return <Phase7SQLiteValidationScreen />;
  if (showPhase8Validation) return <Phase8CommerceValidationScreen />;
  if (showPhase8IapValidation) return <Phase8IapValidationScreen />;
  if (showPhase8PurchaseValidation) return <Phase8PurchaseValidationScreen />;
  if (showPhase8RestoreValidation) return <Phase8RestoreValidationScreen />;
  if (showPhase9SyncQueueValidation) return <Phase9SyncQueueValidationScreen />;
  if (showPhase9FirestoreValidation) return <Phase9FirestoreValidationScreen />;
  return <FactNuggetsApp />;
}

function FactNuggetsApp() {
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

  // Auth restoration is intentionally non-blocking: the child app never waits on Firebase.
  useEffect(() => getParentAccountService().start(), []);

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
