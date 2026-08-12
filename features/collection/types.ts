import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';

export type CollectionStatus = 'not_started' | 'in_progress' | 'completed' | 'locked';

export interface CollectedItem {
  discovery: Discovery;
  collectedAt: string;
}

/** A presentation-ready collection assembled from content plus local progress.
 * Content remains owned by ContentRepository and progress by ProgressRepository. */
export interface ExplorerCollection {
  id: string;
  category: Category;
  deck: Deck;
  discoveries: Discovery[];
  collectedItems: CollectedItem[];
  discoveredIds: Set<string>;
  discoveredCount: number;
  totalCount: number;
  progress: number;
  status: CollectionStatus;
  lastViewedAt: string | null;
}

export interface CollectionsState {
  collections: ExplorerCollection[];
  featured: ExplorerCollection | null;
  totalDiscovered: number;
  totalAvailable: number;
  newestDiscoveryId: string | null;
  isLoading: boolean;
  loadFailed: boolean;
}
