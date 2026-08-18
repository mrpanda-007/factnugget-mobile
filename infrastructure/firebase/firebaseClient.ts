import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';

import {
  getFirebaseAvailability,
  getFirebaseEmulatorConfig,
  type FirebaseAvailability,
} from './firebaseConfig';

let initializationFailed = false;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

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
    const auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    connectAuthToEmulator(auth);
    return auth;
  } catch (error) {
    if ((error as FirebaseInitializationError | null)?.code !== 'auth/already-initialized') {
      initializationFailed = true;
      return null;
    }
    try {
      const auth = getAuth(app);
      connectAuthToEmulator(auth);
      return auth;
    } catch {
      initializationFailed = true;
      return null;
    }
  }
}

function connectAuthToEmulator(auth: Auth): void {
  const emulator = getFirebaseEmulatorConfig();
  if (!emulator || authEmulatorConnected) return;
  connectAuthEmulator(auth, `http://${emulator.host}:${emulator.authPort}`, {
    disableWarnings: true,
  });
  authEmulatorConnected = true;
}

/**
 * Firestore is a transport client only. Its memory cache is deliberately not a
 * product database; SQLite remains the operational local source of truth.
 */
export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    let firestore: Firestore;
    try {
      firestore = initializeFirestore(app, { localCache: memoryLocalCache() });
    } catch {
      firestore = getFirestore(app);
    }
    const emulator = getFirebaseEmulatorConfig();
    if (emulator && !firestoreEmulatorConnected) {
      connectFirestoreEmulator(firestore, emulator.host, emulator.firestorePort);
      firestoreEmulatorConnected = true;
    }
    return firestore;
  } catch {
    initializationFailed = true;
    return null;
  }
}
