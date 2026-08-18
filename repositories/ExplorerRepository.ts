import { SQLiteExplorerRepository } from '@repositories/adapters/SQLiteExplorerRepository';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { Explorer } from '@app-types/domain/progress';
import { getLocalSyncQueueService } from '../application/sync/localSyncQueueRuntime';
import { syncEntityReferences } from '../application/sync/LocalSyncQueueService';

const repository = new SQLiteExplorerRepository();
const syncQueue = getLocalSyncQueueService();

export function getActiveExplorerState() {
  return repository.getActiveState();
}

export async function createOrUpdateActiveExplorer(lookId: ExplorerIdentityId): Promise<Explorer> {
  const { explorer } = await repository.getActiveState();
  if (explorer) {
    await repository.withTransaction(async () => {
      await repository.updateExplorerLook(explorer.id, lookId);
      await syncQueue.enqueueCurrentBinding(syncEntityReferences.explorer(explorer.id));
    });
    return { ...explorer, lookId };
  }
  return repository.withTransaction(async () => {
    const created = await repository.createExplorer(lookId);
    await repository.setActiveExplorer(created.id);
    await syncQueue.enqueueCurrentBinding(syncEntityReferences.explorer(created.id));
    return created;
  });
}

export function setSoundEnabled(enabled: boolean) {
  return repository.setSoundEnabled(enabled);
}
