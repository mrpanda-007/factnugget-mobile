import { createSyncOperationId } from '@app-types/domain/ids';
import type { DiscoveryId, ExplorerId, LearningPackId, WorldId } from '@app-types/domain/ids';
import type { SyncEntityType } from '@app-types/domain/cloud';
import type { CloudAccountBindingRepositoryContract } from '@repositories/contracts/CloudAccountBindingRepositoryContract';
import type { SyncOutboxRepositoryContract } from '@repositories/contracts/SyncOutboxRepositoryContract';

export interface SyncEntityReference {
  entityType: SyncEntityType;
  entityId: string;
}

const separator = '__';

/** Stable local identity, not a Firestore document path or a payload snapshot. */
export const syncEntityReferences = {
  explorer(explorerId: ExplorerId): SyncEntityReference {
    return { entityType: 'explorer', entityId: explorerId };
  },
  discoveryProgress(explorerId: ExplorerId, discoveryId: DiscoveryId): SyncEntityReference {
    return { entityType: 'discoveryProgress', entityId: `${explorerId}${separator}${discoveryId}` };
  },
  packDiscoveryProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    discoveryId: DiscoveryId,
  ): SyncEntityReference {
    return {
      entityType: 'packDiscoveryProgress',
      entityId: `${explorerId}${separator}${learningPackId}${separator}${discoveryId}`,
    };
  },
  learningPackProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
  ): SyncEntityReference {
    return {
      entityType: 'learningPackProgress',
      entityId: `${explorerId}${separator}${learningPackId}`,
    };
  },
  earnedBadge(explorerId: ExplorerId, worldId: WorldId): SyncEntityReference {
    return { entityType: 'earnedBadge', entityId: `${explorerId}${separator}${worldId}` };
  },
};

/**
 * Local-only binding-aware queue writer. Callers must invoke it within the same
 * SQLite transaction as their canonical mutation when one is required.
 */
export class LocalSyncQueueService {
  constructor(
    private readonly bindings: CloudAccountBindingRepositoryContract,
    private readonly outbox: SyncOutboxRepositoryContract,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async enqueueCurrentBinding(reference: SyncEntityReference): Promise<boolean> {
    const binding = await this.bindings.getCurrentBinding();
    if (binding.state !== 'bound') return false;
    await this.outbox.enqueue({
      operationId: createSyncOperationId(),
      familyId: binding.familyId,
      entityType: reference.entityType,
      entityId: reference.entityId,
      createdAt: this.now(),
    });
    return true;
  }
}
