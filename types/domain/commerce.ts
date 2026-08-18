import type { CommerceKey, EntitlementId, LearningPackId, PlatformProductId } from './ids';

export type EntitlementSource = 'apple' | 'google' | 'development';
export type EntitlementStatus = 'active' | 'revoked' | 'expired' | 'unknown';

/** A derived installation/store access right, never a raw store transaction. */
export interface Entitlement {
  id: EntitlementId;
  subject: { type: 'learningPack'; id: LearningPackId };
  source: EntitlementSource;
  status: EntitlementStatus;
  grantedAt: string;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  sourceReferenceHash: string | null;
  updatedAt: string;
}

/**
 * Content availability is deliberately a separate seam. All currently bundled
 * packs are available; a future content-cache phase may add download states.
 */
export type LearningPackAccessDecision =
  | { state: 'accessible'; reason: 'free' | 'entitled'; contentAvailability: 'available' }
  | { state: 'locked'; reason: 'not-entitled' | 'revoked' | 'expired' | 'unknown' };

export interface StoreProduct {
  commerceKey: CommerceKey;
  platformProductId: PlatformProductId;
  localizedPrice: string;
  currencyCode: string | null;
  title: string | null;
  description: string | null;
}

export type StoreProductLookupResult =
  | { state: 'available'; products: StoreProduct[] }
  | { state: 'not-found' }
  | {
      state: 'unavailable';
      code: 'native-module-unavailable' | 'store-unavailable' | 'unsupported-platform';
      retryable: boolean;
    };

export type PurchaseResult =
  | { state: 'success'; commerceKey: CommerceKey }
  | { state: 'cancelled' }
  | { state: 'pending'; commerceKey: CommerceKey }
  | { state: 'already-owned'; commerceKey: CommerceKey }
  | {
      state: 'failed';
      message: string;
      code?: 'product-unavailable' | 'store-unavailable' | 'unsupported-platform' | 'unknown';
      retryable?: boolean;
    };

/** Provider output is derived data only; raw receipts stay inside the native provider. */
export interface ReconciledPurchase {
  commerceKey: CommerceKey;
  source: Exclude<EntitlementSource, 'development'>;
  status: EntitlementStatus;
  grantedAt: string;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  sourceReferenceHash: string | null;
}
