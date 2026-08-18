import type { CloudSyncResult, SyncDirection } from '@app-types/domain/cloud';
import type { ExplorerId } from '@app-types/domain/ids';

/** Future local-first sync orchestration boundary. SQLite outbox persistence starts in Phase 9D. */
export interface SyncServiceContract {
  syncNow(direction?: SyncDirection): Promise<CloudSyncResult>;
  pushPending(): Promise<CloudSyncResult>;
  pullRemote(): Promise<CloudSyncResult>;
  reconcileExplorer(explorerId: ExplorerId): Promise<CloudSyncResult>;
}
