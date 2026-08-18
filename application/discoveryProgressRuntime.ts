import { LegacyContentRepositoryAdapter } from '../repositories/adapters/LegacyContentRepositoryAdapter';
import { SQLiteProgressRepository } from '../repositories/adapters/SQLiteProgressRepository';
import { DiscoveryProgressService } from './DiscoveryProgressService';
import { getLocalSyncQueueService } from './sync/localSyncQueueRuntime';

const content = new LegacyContentRepositoryAdapter();
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
