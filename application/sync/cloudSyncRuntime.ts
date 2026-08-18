import { getFirebaseFirestore } from '../../infrastructure/firebase/firebaseClient';
import { FirestoreCloudSyncRepository } from '@repositories/adapters/FirestoreCloudSyncRepository';
import { SQLiteCloudSyncStateRepository } from '@repositories/adapters/SQLiteCloudSyncStateRepository';

import { CloudSyncService } from './CloudSyncService';
import { getCloudAccountBindingRepository, getSyncOutboxRepository } from './localSyncQueueRuntime';
import { getParentAccountService } from './parentAccountRuntime';

let service: CloudSyncService | null = null;

/** Explicit composition only; nothing starts a cloud sync during app startup. */
export function getCloudSyncService(): CloudSyncService {
  if (!service) {
    const firestore = getFirebaseFirestore();
    service = new CloudSyncService({
      bindings: getCloudAccountBindingRepository(),
      outbox: getSyncOutboxRepository(),
      localState: new SQLiteCloudSyncStateRepository(),
      cloud: firestore ? new FirestoreCloudSyncRepository(firestore) : null,
      session: getParentAccountService(),
    });
  }
  return service;
}
