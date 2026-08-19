import { SQLiteProgressRepository } from '../repositories/adapters/SQLiteProgressRepository';
import { liveContentRepository } from './content/contentRuntime';
import { DiscoveryProgressService } from './DiscoveryProgressService';
import { getLocalSyncQueueService } from './sync/localSyncQueueRuntime';

const content = liveContentRepository;
const progress = new SQLiteProgressRepository();
const service = new DiscoveryProgressService({
  content,
  progress,
  syncQueue: getLocalSyncQueueService(),
});

export function getDiscoveryProgressService(): DiscoveryProgressService {
  return service;
}

export function getSQLiteProgressRepository(): SQLiteProgressRepository {
  return progress;
}
