export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export type FirebaseAvailability =
  | { state: 'available'; config: FirebaseClientConfig }
  | { state: 'notConfigured' }
  | { state: 'initializationFailed' };

export interface FirebaseEmulatorConfig {
  host: string;
  authPort: number;
  firestorePort: number;
  functionsPort: number;
}

function configuredValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Firebase client configuration is client-visible, but must remain environment-specific.
 * Missing configuration is expected in local-only builds and is never a startup error.
 */
export function getFirebaseAvailability(
  environment: Record<string, string | undefined> = process.env,
): FirebaseAvailability {
  const apiKey = configuredValue(environment.EXPO_PUBLIC_FIREBASE_API_KEY);
  const authDomain = configuredValue(environment.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN);
  const projectId = configuredValue(environment.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
  const appId = configuredValue(environment.EXPO_PUBLIC_FIREBASE_APP_ID);
  if (!apiKey || !authDomain || !projectId || !appId) return { state: 'notConfigured' };

  const storageBucket = configuredValue(environment.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = configuredValue(environment.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  return {
    state: 'available',
    config: {
      apiKey,
      authDomain,
      projectId,
      appId,
      ...(storageBucket ? { storageBucket } : {}),
      ...(messagingSenderId ? { messagingSenderId } : {}),
    },
  };
}

/** Emulator use is explicit, development-only, and never inferred from a project ID. */
export function getFirebaseEmulatorConfig(
  environment: Record<string, string | undefined> = process.env,
  isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__,
): FirebaseEmulatorConfig | null {
  if (!isDevelopment || environment.EXPO_PUBLIC_FIREBASE_USE_EMULATOR !== 'true') return null;
  const host = configuredValue(environment.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST);
  if (!host) return null;
  const authPort = Number(environment.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT ?? '9099');
  const firestorePort = Number(environment.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT ?? '8080');
  const functionsPort = Number(environment.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT ?? '5001');
  if (
    !Number.isInteger(authPort) ||
    !Number.isInteger(firestorePort) ||
    !Number.isInteger(functionsPort)
  )
    return null;
  return { host, authPort, firestorePort, functionsPort };
}

/** The deployed Function region is explicitly configurable; no secret belongs in this value. */
export function getFirebaseFunctionsRegion(
  environment: Record<string, string | undefined> = process.env,
): string {
  return configuredValue(environment.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION) ?? 'us-central1';
}
