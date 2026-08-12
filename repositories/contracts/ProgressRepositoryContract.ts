import type {
  DiscoveryProgress,
  EarnedBadge,
  LearningPackProgress,
  PackDiscoveryProgress,
} from '../../types/domain/progress';
import type { DiscoveryId, ExplorerId, LearningPackId, WorldId } from '../../types/domain/ids';

interface DiscoveryProgressWrite {
  explorerId: ExplorerId;
  discoveryId: DiscoveryId;
  occurredAt: string;
}

interface PackDiscoveryProgressWrite extends DiscoveryProgressWrite {
  learningPackId: LearningPackId;
}

export interface ProgressRepositoryContract {
  getDiscoveryProgress(
    explorerId: ExplorerId,
    discoveryId: DiscoveryId,
  ): Promise<DiscoveryProgress | null>;
  listCollectedDiscoveryIds(explorerId: ExplorerId): Promise<DiscoveryId[]>;
  markDiscoveryRevealed(write: DiscoveryProgressWrite): Promise<boolean>;
  collectDiscovery(write: DiscoveryProgressWrite): Promise<boolean>;

  getPackDiscoveryProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    discoveryId: DiscoveryId,
  ): Promise<PackDiscoveryProgress | null>;
  markPackDiscoveryRevealed(write: PackDiscoveryProgressWrite): Promise<boolean>;
  completePackDiscovery(write: PackDiscoveryProgressWrite): Promise<boolean>;

  getLearningPackProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
  ): Promise<LearningPackProgress | null>;
  startOrTouchLearningPack(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    occurredAt: string,
  ): Promise<void>;
  completeLearningPack(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    completionRevision: string,
    occurredAt: string,
  ): Promise<boolean>;

  getEarnedBadge(explorerId: ExplorerId, worldId: WorldId): Promise<EarnedBadge | null>;
  listEarnedBadges(explorerId: ExplorerId): Promise<EarnedBadge[]>;
  earnWorldBadge(
    explorerId: ExplorerId,
    worldId: WorldId,
    contentRevision: string,
    occurredAt: string,
  ): Promise<boolean>;
}
