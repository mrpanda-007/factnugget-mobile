import type { Discovery, LearningPack, World } from '@app-types/domain/content';
import type { DiscoveryId, LearningPackId } from '@app-types/domain/ids';

export type CollectionStatus = 'not_started' | 'in_progress' | 'completed' | 'locked';

export interface CollectedItem {
  discovery: Discovery;
  collectedAt: string;
}

/** A presentation-ready collection assembled from content plus local progress.
 * Content remains owned by the canonical ContentRepository and progress by ProgressRepository. */
export interface ExplorerCollection {
  id: LearningPackId;
  world: World;
  pack: LearningPack;
  discoveries: Discovery[];
  collectedItems: CollectedItem[];
  discoveredIds: Set<DiscoveryId>;
  discoveredCount: number;
  totalCount: number;
  progress: number;
  status: CollectionStatus;
  lastViewedAt: string | null;
  badgeEarnedAt: string | null;
}

export interface CollectionsState {
  collections: ExplorerCollection[];
  featured: ExplorerCollection | null;
  totalDiscovered: number;
  totalAvailable: number;
  newestDiscoveryId: DiscoveryId | null;
  isLoading: boolean;
  loadFailed: boolean;
}
