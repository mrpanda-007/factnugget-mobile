import type { CommerceKey } from '@app-types/domain/ids';
import type {
  PurchaseResult,
  ReconciledPurchase,
  StoreProductLookupResult,
} from '@app-types/domain/commerce';

/** Project-owned boundary for a future StoreKit / Play Billing adapter. */
export interface PurchaseProviderContract {
  loadStoreProducts(commerceKeys: readonly CommerceKey[]): Promise<StoreProductLookupResult>;
  purchase(commerceKey: CommerceKey): Promise<PurchaseResult>;
  restorePurchases(): Promise<ReconciledPurchase[]>;
  reconcileOwnedPurchases(): Promise<ReconciledPurchase[]>;
  /** Finalizes only transactions that CommerceService has durably reconciled. */
  finishReconciledPurchases(purchases: readonly ReconciledPurchase[]): Promise<void>;
}
