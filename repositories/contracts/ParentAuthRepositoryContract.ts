import type {
  ParentAuthResult,
  ParentAuthActionResult,
  ParentAuthSession,
  PasswordResetResult,
} from '@app-types/domain/cloud';

export interface ParentCredentials {
  email: string;
  password: string;
}

/** Parent-only authentication boundary. Implementations must not expose Firebase SDK types. */
export interface ParentAuthRepositoryContract {
  createAccount(credentials: ParentCredentials): Promise<ParentAuthResult>;
  signIn(credentials: ParentCredentials): Promise<ParentAuthResult>;
  signOut(): Promise<ParentAuthActionResult>;
  sendPasswordReset(email: string): Promise<PasswordResetResult>;
  restoreSession(): Promise<ParentAuthSession | null>;
  observeSession(observer: (session: ParentAuthSession | null) => void): () => void;
}
