import { describe, expect, it } from 'vitest';

import { ParentAccountService } from '../application/sync/ParentAccountService';
import {
  getFirebaseAvailability,
  getFirebaseEmulatorConfig,
} from '../infrastructure/firebase/firebaseConfig';
import {
  FirebaseParentAuthRepository,
  normalizeFirebaseAuthError,
} from '../repositories/adapters/FirebaseParentAuthRepository';
import { UnavailableParentAuthRepository } from '../repositories/adapters/UnavailableParentAuthRepository';
import type {
  ParentAuthResult,
  ParentAuthActionResult,
  ParentAuthSession,
  PasswordResetResult,
} from '../types/domain/cloud';
import { parseAuthUserId } from '../types/domain/ids';
import type {
  ParentAuthRepositoryContract,
  ParentCredentials,
} from '../repositories/contracts/ParentAuthRepositoryContract';
import type { Auth, User } from 'firebase/auth';

const session: ParentAuthSession = {
  authUserId: parseAuthUserId('parent-auth-uid'),
  email: 'parent@example.com',
  emailVerified: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

class FakeParentAuthRepository implements ParentAuthRepositoryContract {
  currentSession: ParentAuthSession | null = null;
  createResult: ParentAuthResult = { state: 'success', session };
  signInResult: ParentAuthResult = { state: 'success', session };
  resetResult: PasswordResetResult = { state: 'success' };
  readonly observed: ((value: ParentAuthSession | null) => void)[] = [];
  receivedCredentials: ParentCredentials | null = null;

  async createAccount(credentials: ParentCredentials): Promise<ParentAuthResult> {
    this.receivedCredentials = credentials;
    if (this.createResult.state === 'success') this.currentSession = this.createResult.session;
    return this.createResult;
  }

  async signIn(credentials: ParentCredentials): Promise<ParentAuthResult> {
    this.receivedCredentials = credentials;
    if (this.signInResult.state === 'success') this.currentSession = this.signInResult.session;
    return this.signInResult;
  }

  async signOut(): Promise<ParentAuthActionResult> {
    this.currentSession = null;
    this.emit(null);
    return { state: 'success' };
  }

  async sendPasswordReset(_email: string): Promise<PasswordResetResult> {
    return this.resetResult;
  }

  async restoreSession(): Promise<ParentAuthSession | null> {
    return this.currentSession;
  }

  observeSession(observer: (value: ParentAuthSession | null) => void): () => void {
    this.observed.push(observer);
    observer(this.currentSession);
    return () => {
      this.observed.splice(this.observed.indexOf(observer), 1);
    };
  }

  emit(value: ParentAuthSession | null): void {
    this.currentSession = value;
    this.observed.forEach((observer) => observer(value));
  }
}

function firebaseUser(): User {
  return {
    uid: 'parent-auth-uid',
    email: 'parent@example.com',
    emailVerified: false,
    metadata: { creationTime: '2026-01-01T00:00:00.000Z' },
  } as User;
}

describe('Phase 9C parent Auth foundation', () => {
  it('fails closed when Firebase client configuration is absent', () => {
    expect(getFirebaseAvailability({})).toEqual({ state: 'notConfigured' });
  });

  it('enables emulator routing only for explicit development configuration', () => {
    expect(
      getFirebaseEmulatorConfig({ EXPO_PUBLIC_FIREBASE_USE_EMULATOR: 'true' }, true),
    ).toBeNull();
    expect(
      getFirebaseEmulatorConfig(
        {
          EXPO_PUBLIC_FIREBASE_USE_EMULATOR: 'true',
          EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '10.0.2.2',
        },
        true,
      ),
    ).toMatchObject({ host: '10.0.2.2', authPort: 9099, firestorePort: 8080 });
    expect(
      getFirebaseEmulatorConfig(
        {
          EXPO_PUBLIC_FIREBASE_USE_EMULATOR: 'true',
          EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '10.0.2.2',
        },
        false,
      ),
    ).toBeNull();
  });

  it('centralizes restoring, signed-in, and signed-out state without SQLite effects', async () => {
    const repository = new FakeParentAuthRepository();
    const service = new ParentAccountService(repository);
    const observed: string[] = [];
    const stopState = service.observeAuthState((state) => observed.push(state.state));
    const stopRuntime = service.start();
    expect(service.getAuthState()).toEqual({ state: 'ready', session: null });

    await service.signIn(' parent@example.com ', 'password is not logged');
    expect(repository.receivedCredentials).toEqual({
      email: ' parent@example.com ',
      password: 'password is not logged',
    });
    expect(service.getAuthState()).toEqual({ state: 'ready', session });

    await service.signOut();
    expect(service.getAuthState()).toEqual({ state: 'ready', session: null });
    expect(observed).toEqual(['restoring', 'ready', 'ready', 'ready', 'ready']);
    stopRuntime();
    stopState();
  });

  it('keeps failed sign-in and reset results normalized', async () => {
    const repository = new FakeParentAuthRepository();
    repository.signInResult = { state: 'failure', code: 'invalidCredentials' };
    repository.resetResult = { state: 'failure', code: 'rateLimited' };
    const service = new ParentAccountService(repository);
    expect(await service.signIn('parent@example.com', 'not-logged')).toEqual(
      repository.signInResult,
    );
    expect(await service.requestPasswordReset('parent@example.com')).toEqual(
      repository.resetResult,
    );
    expect(await service.getBinding()).toEqual({ state: 'unbound' });
  });

  it('maps current Firebase errors without returning raw messages', () => {
    expect(normalizeFirebaseAuthError({ code: 'auth/invalid-credential' })).toBe(
      'invalidCredentials',
    );
    expect(normalizeFirebaseAuthError({ code: 'auth/email-already-in-use' })).toBe(
      'emailAlreadyInUse',
    );
    expect(normalizeFirebaseAuthError({ code: 'auth/weak-password' })).toBe('weakPassword');
    expect(normalizeFirebaseAuthError({ code: 'auth/network-request-failed' })).toBe(
      'networkUnavailable',
    );
    expect(normalizeFirebaseAuthError({ code: 'auth/too-many-requests' })).toBe('rateLimited');
    expect(normalizeFirebaseAuthError({ code: 'auth/unrecognized-code' })).toBe('unknownFailure');
  });

  it('normalizes Firebase adapter responses, trims email, and preserves passwords unchanged', async () => {
    let received: { email: string; password: string } | null = null;
    const repository = new FirebaseParentAuthRepository({} as Auth, {
      createUserWithEmailAndPassword: async (_auth, email, password) => {
        received = { email, password };
        return { user: firebaseUser() } as never;
      },
      signInWithEmailAndPassword: async () => ({ user: firebaseUser() }) as never,
      sendPasswordResetEmail: async () => undefined,
      signOut: async () => undefined,
      onAuthStateChanged: () => () => undefined,
    });
    expect(
      await repository.createAccount({ email: ' parent@example.com ', password: ' PaSs ' }),
    ).toEqual({
      state: 'success',
      session,
    });
    expect(received).toEqual({ email: 'parent@example.com', password: ' PaSs ' });
  });

  it('uses an explicit unavailable repository rather than a fake account in local-only builds', async () => {
    const repository = new UnavailableParentAuthRepository();
    expect(
      await repository.createAccount({ email: 'parent@example.com', password: 'password' }),
    ).toEqual({
      state: 'failure',
      code: 'unavailable',
    });
    expect(await repository.restoreSession()).toBeNull();
  });
});
