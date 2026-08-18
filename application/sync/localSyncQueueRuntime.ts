import { SQLiteCloudAccountBindingRepository } from '@repositories/adapters/SQLiteCloudAccountBindingRepository';
import { SQLiteSyncOutboxRepository } from '@repositories/adapters/SQLiteSyncOutboxRepository';

import { LocalSyncQueueService } from './LocalSyncQueueService';

const bindings = new SQLiteCloudAccountBindingRepository();
const outbox = new SQLiteSyncOutboxRepository();
const queue = new LocalSyncQueueService(bindings, outbox);

export function getCloudAccountBindingRepository(): SQLiteCloudAccountBindingRepository {
  return bindings;
}

export function getSyncOutboxRepository(): SQLiteSyncOutboxRepository {
  return outbox;
}

export function getLocalSyncQueueService(): LocalSyncQueueService {
  return queue;
}
