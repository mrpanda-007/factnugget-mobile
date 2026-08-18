import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';

import type {
  ParentAuthFailureCode,
  ParentAuthActionResult,
  ParentAuthResult,
  ParentAuthSession,
  PasswordResetResult,
} from '@app-types/domain/cloud';
import { parseAuthUserId } from '@app-types/domain/ids';
import type {
  ParentAuthRepositoryContract,
  ParentCredentials,
} from '@repositories/contracts/ParentAuthRepositoryContract';

interface FirebaseAuthErrorLike {
  code?: string;
}

export interface FirebaseAuthFunctions {
  createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string,
  ): Promise<UserCredential>;
  signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>;
  sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  signOut(auth: Auth): Promise<void>;
  onAuthStateChanged(auth: Auth, observer: (user: User | null) => void): () => void;
}

const firebaseAuthFunctions: FirebaseAuthFunctions = {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
};

function normalizedEmail(email: string): string {
  return email.trim();
}

export function normalizeFirebaseAuthError(error: unknown): ParentAuthFailureCode {
  const code = (error as FirebaseAuthErrorLike | null)?.code;
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/user-disabled':
      return 'invalidCredentials';
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse';
    case 'auth/weak-password':
      return 'weakPassword';
    case 'auth/network-request-failed':
      return 'networkUnavailable';
    case 'auth/too-many-requests':
      return 'rateLimited';
    case 'auth/operation-not-allowed':
      return 'requiresVerification';
    default:
      return 'unknownFailure';
  }
}

type PasswordResetFailureCode = Extract<PasswordResetResult, { state: 'failure' }>['code'];

function normalizePasswordResetError(error: unknown): PasswordResetFailureCode {
  const normalized = normalizeFirebaseAuthError(error);
  // Password-reset responses must not add an account-enumeration signal.
  return normalized === 'invalidCredentials' || normalized === 'emailAlreadyInUse'
    ? 'unknownFailure'
    : normalized;
}

export function toParentAuthSession(user: User): ParentAuthSession {
  return {
    authUserId: parseAuthUserId(user.uid),
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime ?? null,
  };
}

/** Firebase JS SDK adapter. Firebase User objects and raw errors never leave this boundary. */
export class FirebaseParentAuthRepository implements ParentAuthRepositoryContract {
  constructor(
    private readonly auth: Auth,
    private readonly firebase: FirebaseAuthFunctions = firebaseAuthFunctions,
  ) {}

  async createAccount(credentials: ParentCredentials): Promise<ParentAuthResult> {
    try {
      const result = await this.firebase.createUserWithEmailAndPassword(
        this.auth,
        normalizedEmail(credentials.email),
        credentials.password,
      );
      return { state: 'success', session: toParentAuthSession(result.user) };
    } catch (error) {
      return { state: 'failure', code: normalizeFirebaseAuthError(error) };
    }
  }

  async signIn(credentials: ParentCredentials): Promise<ParentAuthResult> {
    try {
      const result = await this.firebase.signInWithEmailAndPassword(
        this.auth,
        normalizedEmail(credentials.email),
        credentials.password,
      );
      return { state: 'success', session: toParentAuthSession(result.user) };
    } catch (error) {
      return { state: 'failure', code: normalizeFirebaseAuthError(error) };
    }
  }

  async signOut(): Promise<ParentAuthActionResult> {
    try {
      await this.firebase.signOut(this.auth);
      return { state: 'success' };
    } catch (error) {
      return { state: 'failure', code: normalizePasswordResetError(error) };
    }
  }

  async sendPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      await this.firebase.sendPasswordResetEmail(this.auth, normalizedEmail(email));
      return { state: 'success' };
    } catch (error) {
      return { state: 'failure', code: normalizePasswordResetError(error) };
    }
  }

  async restoreSession(): Promise<ParentAuthSession | null> {
    return this.auth.currentUser ? toParentAuthSession(this.auth.currentUser) : null;
  }

  observeSession(observer: (session: ParentAuthSession | null) => void): () => void {
    return this.firebase.onAuthStateChanged(this.auth, (user) =>
      observer(user ? toParentAuthSession(user) : null),
    );
  }
}
