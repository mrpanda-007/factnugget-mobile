import type { LearningPackAccessDecision } from '@app-types/domain/commerce';
import type { LearningPackId } from '@app-types/domain/ids';
import type { ContentRepositoryContract } from '@repositories/contracts/ContentRepositoryContract';
import type { EntitlementRepositoryContract } from '@repositories/contracts/EntitlementRepositoryContract';

export type LearningPackEntryResolution =
  | { state: 'allowed'; decision: LearningPackAccessDecision }
  | { state: 'locked'; decision: LearningPackAccessDecision }
  | { state: 'unavailable' };

/** One application boundary for Pack entry and list-level access projections. */
export class LearningPackAccessService {
  constructor(
    private readonly content: ContentRepositoryContract,
    private readonly entitlements: EntitlementRepositoryContract,
  ) {}

  async getLearningPackAccess(
    learningPackId: LearningPackId,
  ): Promise<LearningPackEntryResolution> {
    const learningPack = await this.content.getLearningPack(learningPackId);
    if (!learningPack) return { state: 'unavailable' };
    const decision = await this.entitlements.getLearningPackAccess(learningPack);
    return decision.state === 'accessible'
      ? { state: 'allowed', decision }
      : { state: 'locked', decision };
  }
}
