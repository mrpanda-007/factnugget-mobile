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
