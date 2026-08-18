import type { CloudSyncResult } from '@app-types/domain/cloud';
import type { ExplorerId } from '@app-types/domain/ids';

/** Explicit local-first reconciliation boundary. It never drives UI rendering or app startup. */
export interface SyncServiceContract {
  syncNow(explorerId: ExplorerId): Promise<CloudSyncResult>;
  pushPending(): Promise<CloudSyncResult>;
  pullExplorer(explorerId: ExplorerId): Promise<CloudSyncResult>;
}
