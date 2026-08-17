import { SQLiteExplorerRepository } from '@repositories/adapters/SQLiteExplorerRepository';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { Explorer } from '@app-types/domain/progress';

const repository = new SQLiteExplorerRepository();

export function getActiveExplorerState() {
  return repository.getActiveState();
}

export async function createOrUpdateActiveExplorer(lookId: ExplorerIdentityId): Promise<Explorer> {
  const { explorer } = await repository.getActiveState();
  if (explorer) {
    await repository.updateExplorerLook(explorer.id, lookId);
    return { ...explorer, lookId };
  }
  const created = await repository.createExplorer(lookId);
  await repository.setActiveExplorer(created.id);
  return created;
}

export function setSoundEnabled(enabled: boolean) {
  return repository.setSoundEnabled(enabled);
}
