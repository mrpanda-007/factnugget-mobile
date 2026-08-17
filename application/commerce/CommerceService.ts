import { getCommerceProductConfig } from '../../commerce/catalogue';
import type {
  Entitlement,
  PurchaseResult,
  ReconciledPurchase,
  StoreProduct,
} from '@app-types/domain/commerce';
import { createEntitlementId, type CommerceKey, type LearningPackId } from '@app-types/domain/ids';
import type { LearningPack } from '@app-types/domain/content';
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
      commerceKey: CommerceKey,
    ) => LearningPackId | undefined,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async resolveStoreProduct(commerceKey: CommerceKey): Promise<StoreProduct | null> {
    this.requireConfiguredProduct(commerceKey);
    return (await this.provider.loadStoreProducts([commerceKey]))[0] ?? null;
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
