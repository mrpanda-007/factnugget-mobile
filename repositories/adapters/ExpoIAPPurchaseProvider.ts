import {
  getCommerceKeyForPlatformProductId,
  getPlatformProductId,
  type CommercePlatform,
} from '../../commerce/catalogue';
import type {
  PurchaseResult,
  OwnedPurchaseQueryResult,
  ReconciledPurchase,
  StoreProduct,
  StoreProductLookupResult,
} from '@app-types/domain/commerce';
import type { CommerceKey } from '@app-types/domain/ids';
import type { PurchaseProviderContract } from '@repositories/contracts/PurchaseProviderContract';

export type ExpoIapErrorCode =
  | 'already-owned'
  | 'deferred-payment'
  | 'iap-not-available'
  | 'init-connection'
  | 'item-unavailable'
  | 'network-error'
  | 'pending'
  | 'query-product'
  | 'service-disconnected'
  | 'service-error'
  | 'sku-not-found'
  | 'user-cancelled'
  | 'unknown';

export interface ExpoIapProduct {
  id: string;
  displayPrice: string;
  currency: string;
  title: string;
  description: string;
}

export interface ExpoIapPurchase {
  productId: string;
  purchaseState: 'pending' | 'purchased' | 'unknown';
  transactionDate: number;
  isAcknowledgedAndroid?: boolean | null;
  revocationDateIOS?: number | null;
}

export interface ExpoIapClient {
  initConnection(): Promise<boolean>;
  endConnection(): Promise<boolean>;
  fetchProducts(request: { skus: string[]; type: 'in-app' }): Promise<ExpoIapProduct[] | null>;
  requestPurchase(request: {
    request: { apple?: { sku: string }; google?: { skus: string[] } };
    type: 'in-app';
  }): Promise<unknown>;
  getAvailablePurchases(): Promise<ExpoIapPurchase[]>;
  restorePurchases(): Promise<void>;
  finishTransaction(request: { purchase: ExpoIapPurchase; isConsumable: false }): Promise<void>;
  purchaseUpdatedListener(listener: (purchase: ExpoIapPurchase) => void): { remove(): void };
  purchaseErrorListener(listener: (error: unknown) => void): { remove(): void };
}

interface PendingPurchase {
  resolve(result: PurchaseResult): void;
}

export interface ExpoIAPPurchaseProviderOptions {
  platform: () => string;
  now?: () => string;
}

function isCommercePlatform(platform: string): platform is CommercePlatform {
  return platform === 'ios' || platform === 'android';
}

function errorCode(error: unknown): ExpoIapErrorCode {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code as ExpoIapErrorCode;
  }
  return 'unknown';
}

function isMissingNativeModule(error: unknown): boolean {
  return error instanceof Error && /native module|ExpoIap/i.test(error.message);
}

/** Maps stable OpenIAP error codes without leaking native diagnostic payloads. */
export function normalizeExpoIapError(error: unknown, commerceKey?: CommerceKey): PurchaseResult {
  switch (errorCode(error)) {
    case 'user-cancelled':
      return { state: 'cancelled' };
    case 'pending':
    case 'deferred-payment':
      return commerceKey
        ? { state: 'pending', commerceKey }
        : { state: 'failed', message: 'The purchase is pending.', code: 'unknown' };
    case 'already-owned':
      return commerceKey
        ? { state: 'already-owned', commerceKey }
        : { state: 'failed', message: 'The item is already owned.', code: 'unknown' };
    case 'item-unavailable':
    case 'sku-not-found':
      return {
        state: 'failed',
        message: 'This Store product is not currently available.',
        code: 'product-unavailable',
        retryable: false,
      };
    case 'network-error':
    case 'service-disconnected':
    case 'service-error':
    case 'iap-not-available':
    case 'init-connection':
    case 'query-product':
      return {
        state: 'failed',
        message: 'The Store is unavailable. Please try again later.',
        code: 'store-unavailable',
        retryable: true,
      };
    default:
      return {
        state: 'failed',
        message: 'The purchase could not be completed.',
        code: 'unknown',
        retryable: false,
      };
  }
}

/**
 * Infrastructure adapter for OpenIAP's low-level API. It never persists
 * entitlements or raw transaction tokens; CommerceService owns persistence.
 */
export class ExpoIAPPurchaseProvider implements PurchaseProviderContract {
  private connection: Promise<boolean> | undefined;
  private connectionError: unknown;
  private listenersStarted = false;
  private readonly pendingPurchases = new Map<CommerceKey, PendingPurchase>();
  private readonly finishablePurchases = new Map<CommerceKey, ExpoIapPurchase[]>();

  constructor(
    private readonly client: ExpoIapClient,
    private readonly options: ExpoIAPPurchaseProviderOptions,
  ) {}

  async loadStoreProducts(commerceKeys: readonly CommerceKey[]): Promise<StoreProductLookupResult> {
    const platform = this.options.platform();
    if (!isCommercePlatform(platform)) {
      return { state: 'unavailable', code: 'unsupported-platform', retryable: false };
    }
    if (!(await this.ensureConnected())) return this.unavailableResult(this.connectionError);

    try {
      const productIds = commerceKeys.map((commerceKey) =>
        getPlatformProductId(commerceKey, platform),
      );
      const products = await this.client.fetchProducts({ skus: productIds, type: 'in-app' });
      const normalized = (products ?? [])
        .filter((product) => productIds.some((productId) => productId === product.id))
        .flatMap((product) => {
          const commerceKey = getCommerceKeyForPlatformProductId(platform, product.id);
          return commerceKey ? [this.toStoreProduct(commerceKey, product)] : [];
        });
      return normalized.length > 0
        ? { state: 'available', products: normalized }
        : { state: 'not-found' };
    } catch (error) {
      return this.unavailableResult(error);
    }
  }

  async purchase(commerceKey: CommerceKey): Promise<PurchaseResult> {
    const platform = this.options.platform();
    if (!isCommercePlatform(platform)) {
      return {
        state: 'failed',
        message: 'Purchases are not supported on this platform.',
        code: 'unsupported-platform',
        retryable: false,
      };
    }
    if (!(await this.ensureConnected())) {
      return isMissingNativeModule(this.connectionError)
        ? {
            state: 'failed',
            message: 'Purchases are unavailable in this build.',
            code: 'store-unavailable',
            retryable: true,
          }
        : normalizeExpoIapError({ code: 'init-connection' });
    }
    if (this.pendingPurchases.has(commerceKey)) {
      return { state: 'failed', message: 'A purchase is already in progress.', code: 'unknown' };
    }

    const productId = getPlatformProductId(commerceKey, platform);
    const result = new Promise<PurchaseResult>((resolve) => {
      this.pendingPurchases.set(commerceKey, { resolve });
    });
    try {
      await this.client.requestPurchase({
        request:
          platform === 'ios' ? { apple: { sku: productId } } : { google: { skus: [productId] } },
        type: 'in-app',
      });
    } catch (error) {
      this.resolvePending(commerceKey, normalizeExpoIapError(error, commerceKey));
    }
    return result;
  }

  async restorePurchases(): Promise<OwnedPurchaseQueryResult> {
    if (!(await this.ensureConnected())) return this.unavailableOwnedResult(this.connectionError);
    try {
      // expo-iap performs AppStore.sync on iOS; Android queries current ownership.
      await this.client.restorePurchases();
      return this.queryOwnedPurchases();
    } catch (error) {
      return this.unavailableOwnedResult(error);
    }
  }

  async reconcileOwnedPurchases(): Promise<OwnedPurchaseQueryResult> {
    if (!(await this.ensureConnected())) return this.unavailableOwnedResult(this.connectionError);
    return this.queryOwnedPurchases();
  }

  private async queryOwnedPurchases(): Promise<OwnedPurchaseQueryResult> {
    try {
      const platform = this.options.platform();
      if (!isCommercePlatform(platform)) {
        return { state: 'unavailable', code: 'unsupported-platform', retryable: false };
      }
      return this.toReconciledPurchases(platform, await this.client.getAvailablePurchases());
    } catch (error) {
      return this.unavailableOwnedResult(error);
    }
  }

  async finishReconciledPurchases(purchases: readonly ReconciledPurchase[]): Promise<void> {
    for (const reconciled of purchases) {
      const nativePurchases = this.finishablePurchases.get(reconciled.commerceKey) ?? [];
      for (const purchase of nativePurchases) {
        await this.client.finishTransaction({ purchase, isConsumable: false });
      }
      this.finishablePurchases.delete(reconciled.commerceKey);
    }
  }

  async dispose(): Promise<void> {
    if (!this.connection) return;
    await this.client.endConnection();
    this.connection = undefined;
    this.connectionError = undefined;
    this.listenersStarted = false;
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.listenersStarted) this.startListeners();
    if (!this.connection) {
      this.connection = this.client.initConnection().catch((error) => {
        this.connectionError = error;
        return false;
      });
    }
    return this.connection;
  }

  private startListeners(): void {
    this.listenersStarted = true;
    this.client.purchaseUpdatedListener((purchase) => {
      const platform = this.options.platform();
      if (!isCommercePlatform(platform)) return;
      const commerceKey = getCommerceKeyForPlatformProductId(platform, purchase.productId);
      if (!commerceKey) return;
      if (purchase.purchaseState === 'pending') {
        this.resolvePending(commerceKey, { state: 'pending', commerceKey });
        return;
      }
      if (purchase.purchaseState === 'purchased') {
        this.rememberFinishablePurchase(commerceKey, purchase);
        this.resolvePending(commerceKey, { state: 'success', commerceKey });
        return;
      }
      this.resolvePending(commerceKey, {
        state: 'failed',
        message: 'The Store did not confirm this purchase.',
        code: 'unknown',
      });
    });
    this.client.purchaseErrorListener((error) => {
      const platform = this.options.platform();
      const productId =
        typeof error === 'object' && error !== null && 'productId' in error
          ? (error as { productId?: unknown }).productId
          : undefined;
      const commerceKey =
        isCommercePlatform(platform) && typeof productId === 'string'
          ? getCommerceKeyForPlatformProductId(platform, productId)
          : undefined;
      if (commerceKey) this.resolvePending(commerceKey, normalizeExpoIapError(error, commerceKey));
    });
  }

  private toStoreProduct(commerceKey: CommerceKey, product: ExpoIapProduct): StoreProduct {
    return {
      commerceKey,
      platformProductId: getPlatformProductId(commerceKey, this.options.platform()),
      localizedPrice: product.displayPrice,
      currencyCode: product.currency || null,
      title: product.title || null,
      description: product.description || null,
    };
  }

  private toReconciledPurchases(
    platform: CommercePlatform,
    purchases: readonly ExpoIapPurchase[],
  ): OwnedPurchaseQueryResult {
    const now = this.now();
    const unknownProductIds: string[] = [];
    const reconciled: ReconciledPurchase[] = purchases.flatMap((purchase): ReconciledPurchase[] => {
      const commerceKey = getCommerceKeyForPlatformProductId(platform, purchase.productId);
      if (!commerceKey) {
        unknownProductIds.push(purchase.productId);
        return [];
      }
      if (purchase.purchaseState !== 'purchased') return [];
      if (this.requiresFinishing(platform, purchase)) {
        this.rememberFinishablePurchase(commerceKey, purchase);
      }
      return [
        {
          commerceKey,
          platformProductId: getPlatformProductId(commerceKey, platform),
          source: platform === 'ios' ? 'apple' : 'google',
          // The active-items query normally omits revoked StoreKit transactions.
          // If the provider supplies an affirmative revocation date, preserve it.
          status:
            platform === 'ios' && typeof purchase.revocationDateIOS === 'number'
              ? 'revoked'
              : 'active',
          grantedAt: this.toIsoDate(purchase.transactionDate) ?? now,
          expiresAt: null,
          lastVerifiedAt: now,
          sourceReferenceHash: null,
        },
      ];
    });
    return { state: 'success', purchases: reconciled, unknownProductIds };
  }

  private rememberFinishablePurchase(commerceKey: CommerceKey, purchase: ExpoIapPurchase): void {
    const current = this.finishablePurchases.get(commerceKey) ?? [];
    if (!current.some((candidate) => candidate.productId === purchase.productId)) {
      this.finishablePurchases.set(commerceKey, [...current, purchase]);
    }
  }

  private requiresFinishing(platform: CommercePlatform, purchase: ExpoIapPurchase): boolean {
    // Android surfaces acknowledgement state directly. StoreKit replays unfinished
    // transactions, so an iOS current entitlement remains safe to finish after
    // durable entitlement persistence.
    return platform === 'ios' || purchase.isAcknowledgedAndroid === false;
  }

  private resolvePending(commerceKey: CommerceKey, result: PurchaseResult): void {
    const pending = this.pendingPurchases.get(commerceKey);
    if (!pending) return;
    this.pendingPurchases.delete(commerceKey);
    pending.resolve(result);
  }

  private unavailableResult(error?: unknown): StoreProductLookupResult {
    return {
      state: 'unavailable',
      code: isMissingNativeModule(error) ? 'native-module-unavailable' : 'store-unavailable',
      retryable: true,
    };
  }

  private unavailableOwnedResult(error?: unknown): OwnedPurchaseQueryResult {
    return {
      state: 'unavailable',
      code: isMissingNativeModule(error) ? 'native-module-unavailable' : 'store-unavailable',
      retryable: true,
    };
  }

  private now(): string {
    return (this.options.now ?? (() => new Date().toISOString()))();
  }

  private toIsoDate(value: number): string | null {
    return Number.isFinite(value) && value > 0 ? new Date(value).toISOString() : null;
  }
}

class UnsupportedExpoIapClient implements ExpoIapClient {
  async initConnection(): Promise<boolean> {
    return false;
  }
  async endConnection(): Promise<boolean> {
    return true;
  }
  async fetchProducts(): Promise<ExpoIapProduct[]> {
    return [];
  }
  async requestPurchase(): Promise<void> {
    throw new Error('Expo IAP is unavailable on this platform.');
  }
  async getAvailablePurchases(): Promise<ExpoIapPurchase[]> {
    return [];
  }
  async restorePurchases(): Promise<void> {}
  async finishTransaction(): Promise<void> {}
  purchaseUpdatedListener(): { remove(): void } {
    return { remove() {} };
  }
  purchaseErrorListener(): { remove(): void } {
    return { remove() {} };
  }
}

/** Web/static-export fallback. Native builds resolve the .native factory instead. */
export function createExpoIAPPurchaseProvider(): PurchaseProviderContract {
  return new ExpoIAPPurchaseProvider(new UnsupportedExpoIapClient(), { platform: () => 'web' });
}
