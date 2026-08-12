import type { LearningPack } from '../../types/domain/content';
import type { ExplorerId } from '../../types/domain/ids';

export type LearningPackAccess = 'accessible' | 'locked';

/** Product boundary only. Purchase providers and transaction state are deliberately deferred. */
export interface EntitlementRepositoryContract {
  getLearningPackAccess(
    explorerId: ExplorerId,
    learningPack: LearningPack,
  ): Promise<LearningPackAccess>;
}
