import type { CommerceKey } from '@app-types/domain/ids';
import type {
  PurchaseResult,
  ReconciledPurchase,
  StoreProductLookupResult,
  OwnedPurchaseQueryResult,
} from '@app-types/domain/commerce';

/** Project-owned boundary for a future StoreKit / Play Billing adapter. */
export interface PurchaseProviderContract {
  loadStoreProducts(commerceKeys: readonly CommerceKey[]): Promise<StoreProductLookupResult>;
  purchase(commerceKey: CommerceKey): Promise<PurchaseResult>;
  /** Explicit Store restore followed by a current-ownership query. */
  restorePurchases(): Promise<OwnedPurchaseQueryResult>;
  /** Current ownership query for interrupted/already-owned recovery. */
  reconcileOwnedPurchases(): Promise<OwnedPurchaseQueryResult>;
  /** Finalizes only transactions that CommerceService has durably reconciled. */
  finishReconciledPurchases(purchases: readonly ReconciledPurchase[]): Promise<void>;
}
