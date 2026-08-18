import { getFirebaseFirestore } from '../../infrastructure/firebase/firebaseClient';
import { FirestoreCloudSyncRepository } from '@repositories/adapters/FirestoreCloudSyncRepository';
import { SQLiteCloudSyncStateRepository } from '@repositories/adapters/SQLiteCloudSyncStateRepository';

import { RemoteExplorerImportService } from './RemoteExplorerImportService';
import { getCloudAccountBindingRepository } from './localSyncQueueRuntime';
import { getParentAccountService } from './parentAccountRuntime';

let service: RemoteExplorerImportService | null = null;

export function getRemoteExplorerImportService(): RemoteExplorerImportService {
  if (!service) {
    const firestore = getFirebaseFirestore();
    service = new RemoteExplorerImportService({
      bindings: getCloudAccountBindingRepository(),
      cloud: firestore ? new FirestoreCloudSyncRepository(firestore) : null,
      localState: new SQLiteCloudSyncStateRepository(),
      session: getParentAccountService(),
    });
  }
  return service;
}
