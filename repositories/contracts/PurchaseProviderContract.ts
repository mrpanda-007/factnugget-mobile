import type { CommerceKey } from '@app-types/domain/ids';
import type { PurchaseResult, ReconciledPurchase, StoreProduct } from '@app-types/domain/commerce';

/** Project-owned boundary for a future StoreKit / Play Billing adapter. */
export interface PurchaseProviderContract {
  loadStoreProducts(commerceKeys: readonly CommerceKey[]): Promise<StoreProduct[]>;
  purchase(commerceKey: CommerceKey): Promise<PurchaseResult>;
  restorePurchases(): Promise<ReconciledPurchase[]>;
  reconcileOwnedPurchases(): Promise<ReconciledPurchase[]>;
}
