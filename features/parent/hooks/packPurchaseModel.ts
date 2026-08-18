import type { CommerceService } from '../../../application/commerce/CommerceService';
import type {
  LearningPackAccessService,
  LearningPackEntryResolution,
} from '../../../application/commerce/LearningPackAccessService';
import type { StoreProduct } from '@app-types/domain/commerce';
import type { LearningPack } from '@app-types/domain/content';
import { getCommerceKeyForPaidLearningPack } from '../../../application/commerce/CommerceService';

export type PackPurchaseUIStatus =
  | 'checking-access'
  | 'owned'
  | 'loading-product'
  | 'available'
  | 'unavailable'
  | 'purchasing'
  | 'pending'
  | 'cancelled'
  | 'failed';

export interface PackPurchaseUIState {
  status: PackPurchaseUIStatus;
  product: StoreProduct | null;
  message: string | null;
  retryable: boolean;
  justPurchased: boolean;
}

export interface PackPurchaseDependencies {
  access: Pick<LearningPackAccessService, 'getLearningPackAccess'>;
  commerce: Pick<CommerceService, 'resolveStoreProduct' | 'purchase'>;
}

const initialState: PackPurchaseUIState = {
  status: 'checking-access',
  product: null,
  message: null,
  retryable: false,
  justPurchased: false,
};

/**
 * A small parent-only purchase state machine. It deliberately treats local
 * access as authoritative and Store metadata as ephemeral presentation data.
 */
export class PackPurchaseViewModel {
  private state = initialState;
  private listeners = new Set<(state: PackPurchaseUIState) => void>();
  private disposed = false;
  private operation = 0;
  private purchaseInFlight: Promise<void> | null = null;

  constructor(
    private readonly pack: LearningPack,
    private readonly dependencies: PackPurchaseDependencies,
  ) {}

  get snapshot(): PackPurchaseUIState {
    return this.state;
  }

  subscribe(listener: (state: PackPurchaseUIState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  async initialize(): Promise<void> {
    await this.resolveAccessThenProduct();
  }

  async retry(): Promise<void> {
    if (this.state.status === 'unavailable') {
      await this.loadProduct();
      return;
    }
    if (this.state.status === 'failed' && this.state.retryable && this.state.product) {
      await this.purchase();
    }
  }

  async purchase(): Promise<void> {
    if (
      this.state.status !== 'available' &&
      this.state.status !== 'cancelled' &&
      !(this.state.status === 'failed' && this.state.retryable)
    ) {
      return;
    }
    if (!this.state.product || this.purchaseInFlight) return;

    const commerceKey = getCommerceKeyForPaidLearningPack(this.pack);
    if (!commerceKey) return;

    const task = this.runPurchase(commerceKey);
    this.purchaseInFlight = task;
    try {
      await task;
    } finally {
      this.purchaseInFlight = null;
    }
  }

  private async runPurchase(commerceKey: NonNullable<LearningPack['commerceKey']>): Promise<void> {
    this.publish({
      status: 'purchasing',
      product: this.state.product,
      message: 'Completing purchase…',
      retryable: false,
      justPurchased: false,
    });
    let result;
    try {
      result = await this.dependencies.commerce.purchase(commerceKey);
    } catch {
      if (!this.disposed) {
        this.publish({
          status: 'failed',
          product: this.state.product,
          message: 'Purchase couldn’t be completed. Please try again.',
          retryable: true,
          justPurchased: false,
        });
      }
      return;
    }
    if (this.disposed) return;

    if (result.state === 'success' || result.state === 'already-owned') {
      const access = await this.dependencies.access.getLearningPackAccess(this.pack.id);
      if (this.disposed) return;
      if (access.state === 'allowed') {
        this.publish({
          status: 'owned',
          product: this.state.product,
          message: null,
          retryable: false,
          justPurchased: result.state === 'success',
        });
        return;
      }
      this.publish({
        status: 'failed',
        product: this.state.product,
        message:
          result.state === 'already-owned'
            ? 'Your purchase could not be refreshed yet. Please try again later.'
            : 'Purchase received, but access could not be refreshed yet.',
        retryable: false,
        justPurchased: false,
      });
      return;
    }

    if (result.state === 'cancelled') {
      this.publish({
        status: 'cancelled',
        product: this.state.product,
        message: 'Purchase cancelled.',
        retryable: false,
        justPurchased: false,
      });
      return;
    }
    if (result.state === 'pending') {
      this.publish({
        status: 'pending',
        product: this.state.product,
        message: `The purchase is pending. ${this.pack.title} is not available yet.`,
        retryable: false,
        justPurchased: false,
      });
      return;
    }
    this.publish({
      status: 'failed',
      product: this.state.product,
      message:
        result.code === 'product-unavailable'
          ? 'This Learning Pack is not available for purchase right now.'
          : 'Purchase couldn’t be completed. Please try again.',
      retryable: result.retryable === true,
      justPurchased: false,
    });
  }

  private async resolveAccessThenProduct(): Promise<void> {
    const operation = ++this.operation;
    this.publish({ ...initialState });
    let access: LearningPackEntryResolution;
    try {
      access = await this.dependencies.access.getLearningPackAccess(this.pack.id);
    } catch {
      if (!this.disposed && operation === this.operation) this.publish(this.unavailableState(true));
      return;
    }
    if (this.disposed || operation !== this.operation) return;
    if (access.state === 'allowed') {
      this.publish({ ...initialState, status: 'owned' });
      return;
    }
    if (access.state === 'unavailable') {
      this.publish(this.unavailableState(false));
      return;
    }
    if (!this.isPaidPack()) {
      this.publish({
        status: 'unavailable',
        product: null,
        message: 'This Learning Pack is not available right now.',
        retryable: false,
        justPurchased: false,
      });
      return;
    }
    await this.loadProduct(operation);
  }

  private async loadProduct(expectedOperation = ++this.operation): Promise<void> {
    const commerceKey = getCommerceKeyForPaidLearningPack(this.pack);
    if (!commerceKey) return;
    this.publish({
      status: 'loading-product',
      product: this.state.product,
      message: 'Checking availability…',
      retryable: false,
      justPurchased: false,
    });
    let lookup;
    try {
      lookup = await this.dependencies.commerce.resolveStoreProduct(commerceKey);
    } catch {
      if (!this.disposed && expectedOperation === this.operation) {
        this.publish(this.unavailableState(true));
      }
      return;
    }
    if (this.disposed || expectedOperation !== this.operation) return;

    // An entitlement can arrive while Store metadata is still being fetched.
    let access: LearningPackEntryResolution;
    try {
      access = await this.dependencies.access.getLearningPackAccess(this.pack.id);
    } catch {
      this.publish(this.unavailableState(true));
      return;
    }
    if (this.disposed || expectedOperation !== this.operation) return;
    if (access.state === 'allowed') {
      this.publish({ ...initialState, status: 'owned' });
      return;
    }
    if (lookup.state === 'available') {
      const product =
        lookup.products.find((candidate) => candidate.commerceKey === commerceKey) ?? null;
      if (product) {
        this.publish({
          status: 'available',
          product,
          message: null,
          retryable: false,
          justPurchased: false,
        });
        return;
      }
    }
    this.publish(this.unavailableState(lookup.state === 'unavailable' && lookup.retryable));
  }

  private isPaidPack(): boolean {
    return this.pack.accessType === 'paid' && Boolean(this.pack.commerceKey);
  }

  private unavailableState(retryable: boolean): PackPurchaseUIState {
    return {
      status: 'unavailable',
      product: null,
      message: 'Purchases are unavailable right now. Please try again later.',
      retryable,
      justPurchased: false,
    };
  }

  private publish(next: PackPurchaseUIState): void {
    this.state = next;
    if (this.disposed) return;
    this.listeners.forEach((listener) => listener(next));
  }
}

export function isAccessible(resolution: LearningPackEntryResolution): boolean {
  return resolution.state === 'allowed';
}
