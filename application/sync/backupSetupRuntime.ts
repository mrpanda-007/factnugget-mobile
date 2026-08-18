import { getCloudSyncService } from './cloudSyncRuntime';
import { BackupSetupService } from './BackupSetupService';
import { getCloudAccountBindingRepository, getSyncOutboxRepository } from './localSyncQueueRuntime';

let service: BackupSetupService | null = null;

export function getBackupSetupService(): BackupSetupService {
  if (!service) {
    service = new BackupSetupService({
      bindings: getCloudAccountBindingRepository(),
      outbox: getSyncOutboxRepository(),
      sync: getCloudSyncService(),
    });
  }
  return service;
}
