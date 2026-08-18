import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';

import { getFirebaseAvailability, type FirebaseAvailability } from './firebaseConfig';

let initializationFailed = false;

type ReactNativeAsyncStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
type ReactNativePersistenceFactory = (storage: ReactNativeAsyncStorage) => Persistence;
interface FirebaseInitializationError {
  code?: string;
}

// Firebase documents this React Native export, but firebase/auth's public TypeScript re-export
// currently omits it. The runtime is still the documented public firebase/auth module.
const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence: ReactNativePersistenceFactory;
  }
).getReactNativePersistence;

export function getFirebaseClientAvailability(): FirebaseAvailability {
  return initializationFailed ? { state: 'initializationFailed' } : getFirebaseAvailability();
}

/** Returns one Firebase app across Fast Refresh/module composition, or null in local-only mode. */
export function getFirebaseApp(): FirebaseApp | null {
  const availability = getFirebaseClientAvailability();
  if (availability.state !== 'available') return null;
  try {
    return getApps().length > 0 ? getApp() : initializeApp(availability.config);
  } catch {
    initializationFailed = true;
    return null;
  }
}

/**
 * Initializes React Native Auth exactly once with Firebase-managed AsyncStorage persistence.
 * `getAuth` is only a duplicate-initialization fallback; no caller initializes Auth directly.
 */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if ((error as FirebaseInitializationError | null)?.code !== 'auth/already-initialized') {
      initializationFailed = true;
      return null;
    }
    try {
      return getAuth(app);
    } catch {
      initializationFailed = true;
      return null;
    }
  }
}
