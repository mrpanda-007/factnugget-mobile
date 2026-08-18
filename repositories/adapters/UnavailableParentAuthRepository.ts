import type {
  ParentAuthResult,
  ParentAuthActionResult,
  ParentAuthSession,
  PasswordResetResult,
} from '@app-types/domain/cloud';
import type {
  ParentAuthRepositoryContract,
  ParentCredentials,
} from '@repositories/contracts/ParentAuthRepositoryContract';

/** Explicit local-only fallback. It never fabricates an authenticated parent session. */
export class UnavailableParentAuthRepository implements ParentAuthRepositoryContract {
  async createAccount(_credentials: ParentCredentials): Promise<ParentAuthResult> {
    return { state: 'failure', code: 'unavailable' };
  }

  async signIn(_credentials: ParentCredentials): Promise<ParentAuthResult> {
    return { state: 'failure', code: 'unavailable' };
  }

  async signOut(): Promise<ParentAuthActionResult> {
    return { state: 'failure', code: 'unavailable' };
  }

  async sendPasswordReset(_email: string): Promise<PasswordResetResult> {
    return { state: 'failure', code: 'unavailable' };
  }

  async restoreSession(): Promise<ParentAuthSession | null> {
    return null;
  }

  observeSession(observer: (session: ParentAuthSession | null) => void): () => void {
    observer(null);
    return () => undefined;
  }
}
