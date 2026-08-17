import { getCommerceKeyForLearningPack } from '../../commerce/catalogue';
import type {
  Entitlement,
  PurchaseResult,
  ReconciledPurchase,
  StoreProduct,
} from '@app-types/domain/commerce';
import { createEntitlementId, type LearningPackId } from '@app-types/domain/ids';
import type { EntitlementRepositoryContract } from '@repositories/contracts/EntitlementRepositoryContract';
import type { PurchaseProviderContract } from '@repositories/contracts/PurchaseProviderContract';

/**
 * Store-facing application boundary. It is intentionally independent from
 * learning progress and is usable with a fake provider before native IAP lands.
 */
export class CommerceService {
  constructor(
    private readonly provider: PurchaseProviderContract,
    private readonly entitlements: EntitlementRepositoryContract,
    private readonly learningPackIdForCommerceKey: (
      commerceKey: string,
    ) => LearningPackId | undefined,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async resolveStoreProduct(learningPackId: LearningPackId): Promise<StoreProduct | null> {
    const commerceKey = getCommerceKeyForLearningPack(learningPackId);
    if (!commerceKey) return null;
    return (await this.provider.loadStoreProducts([commerceKey]))[0] ?? null;
  }

  async purchaseLearningPack(learningPackId: LearningPackId): Promise<PurchaseResult> {
    const commerceKey = getCommerceKeyForLearningPack(learningPackId);
    if (!commerceKey) return { state: 'failed', message: 'This Learning Pack is not purchasable.' };
    const result = await this.provider.purchase(commerceKey);
    if (result.state === 'success' || result.state === 'already-owned') {
      await this.reconcileOwnedPurchases();
    }
    return result;
  }

  async restoreEntitlements(): Promise<Entitlement[]> {
    return this.persistReconciledPurchases(await this.provider.restorePurchases());
  }

  async reconcileOwnedPurchases(): Promise<Entitlement[]> {
    return this.persistReconciledPurchases(await this.provider.reconcileOwnedPurchases());
  }

  private async persistReconciledPurchases(
    purchases: readonly ReconciledPurchase[],
  ): Promise<Entitlement[]> {
    const stored: Entitlement[] = [];
    for (const purchase of purchases) {
      const learningPackId = this.learningPackIdForCommerceKey(purchase.commerceKey);
      if (!learningPackId) continue;
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
    }
    return stored;
  }
}
