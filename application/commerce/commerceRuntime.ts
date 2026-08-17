import { getLearningPackIdForCommerceKey } from '../../commerce/catalogue';
import { LegacyContentRepositoryAdapter } from '@repositories/adapters/LegacyContentRepositoryAdapter';
import { SQLiteEntitlementRepository } from '@repositories/adapters/SQLiteEntitlementRepository';
import type {
  Entitlement,
  EntitlementSource,
  PurchaseResult,
  StoreProduct,
} from '@app-types/domain/commerce';
import { createEntitlementId, type CommerceKey, type LearningPackId } from '@app-types/domain/ids';
import type { PurchaseProviderContract } from '@repositories/contracts/PurchaseProviderContract';
import { CommerceService } from './CommerceService';
import { LearningPackAccessService } from './LearningPackAccessService';

export type CommerceEnvironment = 'development' | 'staging' | 'production';

/** A release binary always resolves production, regardless of public env values. */
export function resolveCommerceEnvironment(
  rawEnvironment = process.env.EXPO_PUBLIC_APP_ENV,
): CommerceEnvironment {
  if (!__DEV__) return 'production';
  if (rawEnvironment === 'staging') return 'staging';
  return 'development';
}

class UnavailablePurchaseProvider implements PurchaseProviderContract {
  async loadStoreProducts(_commerceKeys: readonly CommerceKey[]): Promise<StoreProduct[]> {
    return [];
  }

  async purchase(_commerceKey: CommerceKey): Promise<PurchaseResult> {
    return { state: 'failed', message: 'Purchases are not available in this build.' };
  }

  async restorePurchases() {
    return [];
  }

  async reconcileOwnedPurchases() {
    return [];
  }
}

export interface DevelopmentEntitlementGrants {
  grantLearningPack(learningPackId: LearningPackId): Promise<Entitlement>;
}

function createDevelopmentEntitlementGrants(
  entitlements: SQLiteEntitlementRepository,
): DevelopmentEntitlementGrants {
  return {
    grantLearningPack: async (learningPackId) => {
      const now = new Date().toISOString();
      return entitlements.upsertEntitlement({
        id: createEntitlementId(),
        subject: { type: 'learningPack', id: learningPackId },
        source: 'development',
        status: 'active',
        grantedAt: now,
        expiresAt: null,
        lastVerifiedAt: now,
        sourceReferenceHash: null,
        updatedAt: now,
      });
    },
  };
}

export interface CommerceDependencies {
  environment: CommerceEnvironment;
  entitlements: SQLiteEntitlementRepository;
  access: LearningPackAccessService;
  commerce: CommerceService;
  developmentEntitlements?: DevelopmentEntitlementGrants;
}

/** The sole composition point for commerce implementations and development grants. */
export function createCommerceDependencies(
  environment: CommerceEnvironment = resolveCommerceEnvironment(),
): CommerceDependencies {
  const allowedSources: readonly EntitlementSource[] =
    environment === 'production' ? ['apple', 'google'] : ['apple', 'google', 'development'];
  const entitlements = new SQLiteEntitlementRepository({ allowedSources });
  const content = new LegacyContentRepositoryAdapter();
  const commerce = new CommerceService(
    new UnavailablePurchaseProvider(),
    entitlements,
    getLearningPackIdForCommerceKey,
  );
  return {
    environment,
    entitlements,
    access: new LearningPackAccessService(content, entitlements),
    commerce,
    ...(environment === 'production'
      ? {}
      : { developmentEntitlements: createDevelopmentEntitlementGrants(entitlements) }),
  };
}

const dependencies = createCommerceDependencies();

export function getLearningPackAccessService(): LearningPackAccessService {
  return dependencies.access;
}

export function getCommerceDependencies(): CommerceDependencies {
  return dependencies;
}
