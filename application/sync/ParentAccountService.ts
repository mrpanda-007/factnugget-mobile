import type {
  CloudAccountBinding,
  ParentAuthResult,
  ParentAuthActionResult,
  ParentAuthSession,
  ParentAuthState,
  PasswordResetResult,
} from '@app-types/domain/cloud';
import type { ParentAuthRepositoryContract } from '@repositories/contracts/ParentAuthRepositoryContract';
import type { CloudAccountBindingRepositoryContract } from '@repositories/contracts/CloudAccountBindingRepositoryContract';

import type { ParentAccountServiceContract } from './ParentAccountServiceContract';

/** Parent-only application service. It never accesses Firebase, SQLite, or Explorer state directly. */
export class ParentAccountService implements ParentAccountServiceContract {
  private state: ParentAuthState = { state: 'restoring', session: null };
  private readonly observers = new Set<(state: ParentAuthState) => void>();
  private stopObservingRepository: (() => void) | null = null;

  constructor(
    private readonly repository: ParentAuthRepositoryContract,
    private readonly bindings: Pick<CloudAccountBindingRepositoryContract, 'getCurrentBinding'> = {
      getCurrentBinding: async () => ({ state: 'unbound' }),
    },
  ) {}

  async createAccount(email: string, password: string): Promise<ParentAuthResult> {
    const result = await this.repository.createAccount({ email, password });
    if (result.state === 'success') this.setState({ state: 'ready', session: result.session });
    return result;
  }

  async signIn(email: string, password: string): Promise<ParentAuthResult> {
    const result = await this.repository.signIn({ email, password });
    if (result.state === 'success') this.setState({ state: 'ready', session: result.session });
    return result;
  }

  async signOut(): Promise<ParentAuthActionResult> {
    const result = await this.repository.signOut();
    if (result.state === 'success') this.setState({ state: 'ready', session: null });
    return result;
  }

  requestPasswordReset(email: string): Promise<PasswordResetResult> {
    return this.repository.sendPasswordReset(email);
  }

  getSession(): Promise<ParentAuthSession | null> {
    return this.repository.restoreSession();
  }

  getAuthState(): ParentAuthState {
    return this.state;
  }

  observeAuthState(observer: (state: ParentAuthState) => void): () => void {
    this.observers.add(observer);
    observer(this.state);
    return () => this.observers.delete(observer);
  }

  /** Starts exactly one centralized Firebase session observer. Safe to call from app composition. */
  start(): () => void {
    if (!this.stopObservingRepository) {
      this.stopObservingRepository = this.repository.observeSession((session) => {
        this.setState({ state: 'ready', session });
      });
    }
    return () => {
      this.stopObservingRepository?.();
      this.stopObservingRepository = null;
    };
  }

  async getBinding(): Promise<CloudAccountBinding> {
    return this.bindings.getCurrentBinding();
  }

  private setState(state: ParentAuthState): void {
    this.state = state;
    this.observers.forEach((observer) => observer(state));
  }
}
