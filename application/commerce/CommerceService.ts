import { getCommerceProductConfig } from '../../commerce/catalogue';
import type {
  Entitlement,
  OwnedPurchaseQueryResult,
  PurchaseResult,
  ReconciledPurchase,
  StoreProductLookupResult,
} from '@app-types/domain/commerce';
import { createEntitlementId, type CommerceKey, type LearningPackId } from '@app-types/domain/ids';
import type { LearningPack } from '@app-types/domain/content';
import type { EntitlementRepositoryContract } from '@repositories/contracts/EntitlementRepositoryContract';
import type { PurchaseProviderContract } from '@repositories/contracts/PurchaseProviderContract';

export type CommerceReconciliationResult =
  | {
      state: 'restored';
      restoredCommerceKeys: CommerceKey[];
      unchangedCommerceKeys: CommerceKey[];
      unknownProductIds: string[];
      failedCommerceKeys: CommerceKey[];
    }
  | {
      state: 'nothing-found';
      unknownProductIds: string[];
    }
  | {
      state: 'unavailable';
      retryable: boolean;
    }
  | {
      state: 'failed';
      restoredCommerceKeys: CommerceKey[];
      unchangedCommerceKeys: CommerceKey[];
      unknownProductIds: string[];
      failedCommerceKeys: CommerceKey[];
    };

/**
 * Store-facing application boundary. It is intentionally independent from
 * learning progress and is usable with a fake provider before native IAP lands.
 */
export class CommerceService {
  private reconciliationInFlight: Promise<CommerceReconciliationResult> | null = null;
  constructor(
    private readonly provider: PurchaseProviderContract,
    private readonly entitlements: EntitlementRepositoryContract,
    private readonly learningPackIdForCommerceKey: (
      commerceKey: CommerceKey,
    ) => LearningPackId | undefined,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async resolveStoreProduct(commerceKey: CommerceKey): Promise<StoreProductLookupResult> {
    this.requireConfiguredProduct(commerceKey);
    return this.provider.loadStoreProducts([commerceKey]);
  }

  async purchase(commerceKey: CommerceKey): Promise<PurchaseResult> {
    this.requireConfiguredProduct(commerceKey);
    const result = await this.provider.purchase(commerceKey);
    if (result.state === 'success' || result.state === 'already-owned') {
      await this.reconcileOwnedPurchases();
    }
    return result;
  }

  private requireConfiguredProduct(commerceKey: CommerceKey): void {
    if (!getCommerceProductConfig(commerceKey)) {
      throw new Error(`No commerce product mapping configured for CommerceKey: ${commerceKey}`);
    }
  }

  /** Explicit parent-requested recovery; the provider performs its platform restore first. */
  async restoreEntitlements(): Promise<CommerceReconciliationResult> {
    return this.runReconciliation(() => this.provider.restorePurchases());
  }

  /** Shared recovery path for purchase success, already-owned, and interrupted transactions. */
  async reconcileOwnedPurchases(): Promise<CommerceReconciliationResult> {
    return this.runReconciliation(() => this.provider.reconcileOwnedPurchases());
  }

  private runReconciliation(
    query: () => Promise<OwnedPurchaseQueryResult>,
  ): Promise<CommerceReconciliationResult> {
    if (!this.reconciliationInFlight) {
      this.reconciliationInFlight = this.persistReconciledPurchases(query).finally(() => {
        this.reconciliationInFlight = null;
      });
    }
    return this.reconciliationInFlight;
  }

  private async persistReconciledPurchases(
    query: () => Promise<OwnedPurchaseQueryResult>,
  ): Promise<CommerceReconciliationResult> {
    let queryResult: OwnedPurchaseQueryResult;
    try {
      queryResult = await query();
    } catch {
      return { state: 'unavailable', retryable: true };
    }
    if (queryResult.state === 'unavailable') {
      return { state: 'unavailable', retryable: queryResult.retryable };
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__ && queryResult.unknownProductIds.length > 0) {
      console.warn(
        'Ignoring unknown Store products during reconciliation.',
        queryResult.unknownProductIds,
      );
    }

    const stored: Entitlement[] = [];
    const finalized: ReconciledPurchase[] = [];
    const restoredCommerceKeys: CommerceKey[] = [];
    const unchangedCommerceKeys: CommerceKey[] = [];
    const failedCommerceKeys: CommerceKey[] = [];
    for (const purchase of queryResult.purchases) {
      const learningPackId = this.learningPackIdForCommerceKey(purchase.commerceKey);
      if (!learningPackId) {
        failedCommerceKeys.push(purchase.commerceKey);
        continue;
      }
      try {
        const existing = await this.entitlements.getEntitlementsForLearningPack(learningPackId);
        const alreadyActive = existing.some(
          (entitlement) =>
            entitlement.source === purchase.source && entitlement.status === 'active',
        );
        stored.push(
          await this.entitlements.upsertEntitlement({
            id: createEntitlementId(),
            subject: { type: 'learningPack', id: learningPackId },
            source: purchase.source,
            status: purchase.status,
            grantedAt: purchase.grantedAt,
            expiresAt: purchase.expiresAt,
            lastVerifiedAt: purchase.lastVerifiedAt,
            sourceReferenceHash: purchase.sourceReferenceHash,
            updatedAt: this.now(),
          }),
        );
        (alreadyActive ? unchangedCommerceKeys : restoredCommerceKeys).push(purchase.commerceKey);
        finalized.push(purchase);
      } catch {
        failedCommerceKeys.push(purchase.commerceKey);
      }
    }
    try {
      await this.provider.finishReconciledPurchases(finalized);
    } catch {
      // The entitlement is already durable. A later owned-purchase reconciliation retries finish.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Commerce transaction finalization will be retried.');
      }
    }
    if (stored.length === 0 && failedCommerceKeys.length === 0) {
      return { state: 'nothing-found', unknownProductIds: queryResult.unknownProductIds };
    }
    const summary = {
      restoredCommerceKeys,
      unchangedCommerceKeys,
      unknownProductIds: queryResult.unknownProductIds,
      failedCommerceKeys,
    };
    return failedCommerceKeys.length > 0
      ? { state: 'failed', ...summary }
      : { state: 'restored', ...summary };
  }
}

/**
 * Converts canonical Pack metadata into a commerce capability at the boundary
 * before native product lookup. Free Packs bypass commerce entirely.
 */
export function getCommerceKeyForPaidLearningPack(
  learningPack: LearningPack,
): CommerceKey | undefined {
  if (learningPack.accessType === 'free') return undefined;
  if (!learningPack.commerceKey) {
    throw new Error(`Paid Learning Pack is missing a CommerceKey: ${learningPack.id}`);
  }
  return learningPack.commerceKey;
}
