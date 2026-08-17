import type {
  Entitlement,
  EntitlementSource,
  LearningPackAccessDecision,
} from '@app-types/domain/commerce';
import type { LearningPack } from '@app-types/domain/content';

export interface EntitlementAccessPolicy {
  allowedSources: readonly EntitlementSource[];
  now: () => string;
}

/**
 * Converts cached derived entitlements into the one access decision used by
 * Explore, Collection, Parent, and protected Pack entry. Content readiness is
 * intentionally outside entitlement persistence.
 */
export function decideLearningPackAccess(
  learningPack: LearningPack,
  entitlements: readonly Entitlement[],
  policy: EntitlementAccessPolicy,
): LearningPackAccessDecision {
  if (learningPack.accessType === 'free') {
    return { state: 'accessible', reason: 'free', contentAvailability: 'available' };
  }

  const candidates = entitlements.filter((entitlement) =>
    policy.allowedSources.includes(entitlement.source),
  );
  const active = candidates.find(
    (entitlement) =>
      entitlement.status === 'active' &&
      (entitlement.expiresAt === null || entitlement.expiresAt > policy.now()),
  );
  if (active) return { state: 'accessible', reason: 'entitled', contentAvailability: 'available' };

  if (candidates.some((entitlement) => entitlement.status === 'revoked')) {
    return { state: 'locked', reason: 'revoked' };
  }
  if (
    candidates.some(
      (entitlement) =>
        entitlement.status === 'expired' ||
        (entitlement.status === 'active' &&
          entitlement.expiresAt !== null &&
          entitlement.expiresAt <= policy.now()),
    )
  ) {
    return { state: 'locked', reason: 'expired' };
  }
  if (candidates.some((entitlement) => entitlement.status === 'unknown')) {
    return { state: 'locked', reason: 'unknown' };
  }
  return { state: 'locked', reason: 'not-entitled' };
}
