import type {
  CloudAccountBinding,
  ParentAuthResult,
  ParentAuthActionResult,
  ParentAuthSession,
  ParentAuthState,
  PasswordResetResult,
} from '@app-types/domain/cloud';

/** Future Parent Area orchestration boundary; it is deliberately not a Firebase adapter. */
export interface ParentAccountServiceContract {
  createAccount(email: string, password: string): Promise<ParentAuthResult>;
  signIn(email: string, password: string): Promise<ParentAuthResult>;
  signOut(): Promise<ParentAuthActionResult>;
  requestPasswordReset(email: string): Promise<PasswordResetResult>;
  getSession(): Promise<ParentAuthSession | null>;
  getAuthState(): ParentAuthState;
  observeAuthState(observer: (state: ParentAuthState) => void): () => void;
  start(): () => void;
  getBinding(): Promise<CloudAccountBinding>;
}
