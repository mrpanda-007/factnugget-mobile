import type {
  CommerceReconciliationResult,
  CommerceService,
} from '../../../application/commerce/CommerceService';

export type RestorePurchasesStatus = 'idle' | 'restoring' | 'restored' | 'nothing-found' | 'failed';

export interface RestorePurchasesUIState {
  status: RestorePurchasesStatus;
  message: string | null;
  retryable: boolean;
}

export interface RestorePurchasesDependencies {
  commerce: Pick<CommerceService, 'restoreEntitlements'>;
}

const initialState: RestorePurchasesUIState = {
  status: 'idle',
  message: null,
  retryable: false,
};

/** Parent-facing state machine for Store-backed entitlement recovery. */
export class RestorePurchasesViewModel {
  private state = initialState;
  private listeners = new Set<(state: RestorePurchasesUIState) => void>();
  private restoreInFlight: Promise<RestorePurchasesUIState> | null = null;
  private disposed = false;

  constructor(private readonly dependencies: RestorePurchasesDependencies) {}

  get snapshot(): RestorePurchasesUIState {
    return this.state;
  }

  subscribe(listener: (state: RestorePurchasesUIState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  async restore(): Promise<RestorePurchasesUIState> {
    if (this.restoreInFlight) return this.restoreInFlight;
    const task = this.runRestore();
    this.restoreInFlight = task;
    try {
      return await task;
    } finally {
      this.restoreInFlight = null;
    }
  }

  private async runRestore(): Promise<RestorePurchasesUIState> {
    this.publish({
      status: 'restoring',
      message: 'Checking previous purchases…',
      retryable: false,
    });
    let result: CommerceReconciliationResult;
    try {
      result = await this.dependencies.commerce.restoreEntitlements();
    } catch {
      return this.publish({
        status: 'failed',
        message: 'Purchases couldn’t be restored right now. Please try again later.',
        retryable: true,
      });
    }
    if (this.disposed) return this.state;
    if (result.state === 'restored') {
      return this.publish({
        status: 'restored',
        message:
          result.restoredCommerceKeys.length > 0
            ? 'Purchases restored.'
            : 'Your previous purchases are already available.',
        retryable: false,
      });
    }
    if (result.state === 'nothing-found') {
      return this.publish({
        status: 'nothing-found',
        message: 'No previous purchases were found for this Store account.',
        retryable: false,
      });
    }
    if (result.state === 'unavailable') {
      return this.publish({
        status: 'failed',
        message: 'Purchases couldn’t be restored right now. Please try again later.',
        retryable: result.retryable,
      });
    }
    return this.publish({
      status: 'failed',
      message:
        result.restoredCommerceKeys.length > 0
          ? 'Some purchases were restored. Please try again later for the rest.'
          : 'Purchases couldn’t be restored right now. Please try again later.',
      retryable: true,
    });
  }

  private publish(next: RestorePurchasesUIState): RestorePurchasesUIState {
    this.state = next;
    if (!this.disposed) this.listeners.forEach((listener) => listener(next));
    return next;
  }
}
