import type { Entitlement, LearningPackAccessDecision } from '../../types/domain/commerce';
import type { LearningPack } from '../../types/domain/content';
import type { LearningPackId } from '../../types/domain/ids';

export type LearningPackAccess = LearningPackAccessDecision;

/**
 * Installation/store-scoped access cache. Explorer progress deliberately does
 * not participate in this contract.
 */
export interface EntitlementRepositoryContract {
  getLearningPackAccess(learningPack: LearningPack): Promise<LearningPackAccess>;
  listEntitlements(): Promise<Entitlement[]>;
  getEntitlementsForLearningPack(learningPackId: LearningPackId): Promise<Entitlement[]>;
  upsertEntitlement(entitlement: Entitlement): Promise<Entitlement>;
}
