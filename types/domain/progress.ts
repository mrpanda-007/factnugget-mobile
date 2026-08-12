import type { ExplorerIdentityId } from '../ExplorerIdentity';
import type { DiscoveryId, ExplorerId, LearningPackId, WorldId } from './ids';

export interface Explorer {
  id: ExplorerId;
  lookId: ExplorerIdentityId;
  createdAt: string;
}

/** Global knowledge state: one record per Explorer + Discovery. */
export interface DiscoveryProgress {
  explorerId: ExplorerId;
  discoveryId: DiscoveryId;
  revealedAt: string | null;
  collectedAt: string | null;
}

/** Contextual encounter state: one record per Explorer + Pack membership. */
export interface PackDiscoveryProgress {
  explorerId: ExplorerId;
  learningPackId: LearningPackId;
  discoveryId: DiscoveryId;
  revealedAt: string | null;
  completedAt: string | null;
}

export interface LearningPackProgress {
  explorerId: ExplorerId;
  learningPackId: LearningPackId;
  startedAt: string;
  lastViewedAt: string;
  completedAt: string | null;
  completionRevision: string | null;
}

/** Persisted separately from the WorldBadge content definition. */
export interface EarnedBadge {
  explorerId: ExplorerId;
  worldId: WorldId;
  earnedAt: string;
  contentRevision: string;
}

export type DiscoveryProgressState = 'unseen' | 'revealed' | 'collected';

/** Collected is always treated as revealed, including imported legacy records. */
export function getDiscoveryProgressState(
  progress: DiscoveryProgress | null,
): DiscoveryProgressState {
  if (progress?.collectedAt) return 'collected';
  if (progress?.revealedAt) return 'revealed';
  return 'unseen';
}
