import { describe, expect, it } from 'vitest';

import { DiscoveryProgressService } from '../application/DiscoveryProgressService';
import {
  LocalSyncQueueService,
  syncEntityReferences,
} from '../application/sync/LocalSyncQueueService';
import type { CloudAccountBinding, CloudSyncError, SyncOperation } from '../types/domain/cloud';
import {
  parseAuthUserId,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
  parseLearningPackId,
} from '../types/domain/ids';
import type { CloudAccountBindingRepositoryContract } from '../repositories/contracts/CloudAccountBindingRepositoryContract';
import type {
  EnqueueSyncOperationInput,
  SyncOutboxRepositoryContract,
} from '../repositories/contracts/SyncOutboxRepositoryContract';
import {
  InMemoryContentRepository,
  InMemoryProgressRepository,
} from './helpers/InMemoryRepositories';
import { makeDiscovery, makePack, makeWorld, membership } from './helpers/fixtures';

const familyA = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const familyB = parseFamilyId('00000000-0000-4000-8000-0000000000b2');
const authA = parseAuthUserId('firebase-parent-a');
const authB = parseAuthUserId('firebase-parent-b');
const explorerId = parseExplorerId('00000000-0000-4000-8000-000000000001');
const packId = parseLearningPackId('ocean-giants');
const discoveryId = parseDiscoveryId('blue-whale');
const timestamp = '2026-08-18T00:00:00.000Z';

class MemoryBindings implements CloudAccountBindingRepositoryContract {
  binding: CloudAccountBinding = { state: 'unbound' };

  async getCurrentBinding(): Promise<CloudAccountBinding> {
    return this.binding;
  }

  async bind(input: { authUserId: typeof authA; familyId: typeof familyA; boundAt: string }) {
    if (this.binding.state !== 'unbound') {
      if (
        this.binding.authUserId === input.authUserId &&
        this.binding.familyId === input.familyId
      ) {
        return this.binding;
      }
      throw new Error(
        'A different cloud account binding is already active. Detach it explicitly first.',
      );
    }
    this.binding = { state: 'bound', ...input, updatedAt: input.boundAt };
    return this.binding;
  }

  async replaceBinding(input: {
    authUserId: typeof authA;
    familyId: typeof familyA;
    boundAt: string;
  }) {
    this.binding = { state: 'bound', ...input, updatedAt: input.boundAt };
    return this.binding;
  }

  async detach(): Promise<void> {
    this.binding = { state: 'unbound' };
  }
}

class MemoryOutbox implements SyncOutboxRepositoryContract {
  operations: SyncOperation[] = [];
  failEnqueue = false;

  async enqueue(input: EnqueueSyncOperationInput): Promise<SyncOperation> {
    if (this.failEnqueue) throw new Error('controlled outbox failure');
    const existing = this.operations.find(
      (item) =>
        item.familyId === input.familyId &&
        item.entityType === input.entityType &&
        item.entityId === input.entityId,
    );
    if (existing) return existing;
    const operation: SyncOperation = {
      ...input,
      operation: 'upsert',
      attemptCount: 0,
      lastAttemptAt: null,
      lastErrorCode: null,
    };
    this.operations.push(operation);
    return operation;
  }

  async listPending(familyId: typeof familyA, limit: number): Promise<SyncOperation[]> {
    return this.operations
      .filter((item) => item.familyId === familyId)
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.operationId.localeCompare(b.operationId),
      )
      .slice(0, limit);
  }

  async countPending(familyId: typeof familyA): Promise<number> {
    return (await this.listPending(familyId, Number.MAX_SAFE_INTEGER)).length;
  }

  async removeDelivered(operationId: string): Promise<void> {
    this.operations = this.operations.filter((item) => item.operationId !== operationId);
  }

  async recordAttemptFailure(
    operationId: string,
    errorCode: CloudSyncError,
    attemptedAt: string,
  ): Promise<void> {
    this.operations = this.operations.map((item) =>
      item.operationId === operationId
        ? {
            ...item,
            attemptCount: item.attemptCount + 1,
            lastAttemptAt: attemptedAt,
            lastErrorCode: errorCode,
          }
        : item,
    );
  }
}

function makeQueue(bindings = new MemoryBindings(), outbox = new MemoryOutbox()) {
  return { bindings, outbox, queue: new LocalSyncQueueService(bindings, outbox, () => timestamp) };
}

describe('Phase 9D local sync queue foundation', () => {
  it('keeps guest writes unqueued, keeps Auth and Family IDs separate, and coalesces entity references', async () => {
    const { bindings, outbox, queue } = makeQueue();
    const reference = syncEntityReferences.discoveryProgress(explorerId, discoveryId);
    expect(await queue.enqueueCurrentBinding(reference)).toBe(false);
    expect(outbox.operations).toEqual([]);

    await bindings.bind({ authUserId: authA, familyId: familyA, boundAt: timestamp });
    await queue.enqueueCurrentBinding(reference);
    await queue.enqueueCurrentBinding(reference);
    expect(outbox.operations).toHaveLength(1);
    expect(outbox.operations[0]).toMatchObject({
      familyId: familyA,
      entityType: 'discoveryProgress',
    });
    expect(outbox.operations[0].entityId).toBe(`${explorerId}__${discoveryId}`);
  });

  it('retains Family A work through detach and never reassigns it when Family B binds', async () => {
    const { bindings, outbox, queue } = makeQueue();
    await bindings.bind({ authUserId: authA, familyId: familyA, boundAt: timestamp });
    await queue.enqueueCurrentBinding(
      syncEntityReferences.discoveryProgress(explorerId, discoveryId),
    );
    await bindings.detach();
    await bindings.bind({ authUserId: authB, familyId: familyB, boundAt: timestamp });
    await queue.enqueueCurrentBinding(
      syncEntityReferences.learningPackProgress(explorerId, packId),
    );

    expect(await outbox.listPending(familyA, 10)).toHaveLength(1);
    expect(await outbox.listPending(familyB, 10)).toHaveLength(1);
    expect(outbox.operations.map((operation) => operation.familyId)).toEqual([familyA, familyB]);
  });

  it('queues all canonical progress entities in a bound discovery completion transaction', async () => {
    const { bindings, outbox, queue } = makeQueue();
    await bindings.bind({ authUserId: authA, familyId: familyA, boundAt: timestamp });
    const content = new InMemoryContentRepository({
      worlds: [makeWorld()],
      learningPacks: [makePack('ocean-giants', 1)],
      discoveries: [makeDiscovery('blue-whale')],
      memberships: [membership('ocean-giants', 'blue-whale', 1)],
    });
    const progress = new InMemoryProgressRepository();
    const service = new DiscoveryProgressService({
      content,
      progress,
      syncQueue: queue,
      now: () => timestamp,
    });

    await service.collectDiscovery({ explorerId, learningPackId: packId, discoveryId });
    expect(outbox.operations.map((operation) => operation.entityType).sort()).toEqual([
      'discoveryProgress',
      'earnedBadge',
      'learningPackProgress',
      'packDiscoveryProgress',
    ]);
  });

  it('rolls back a bound mutation when enqueue fails inside the transaction', async () => {
    const { bindings, outbox, queue } = makeQueue();
    await bindings.bind({ authUserId: authA, familyId: familyA, boundAt: timestamp });
    outbox.failEnqueue = true;
    const content = new InMemoryContentRepository({
      worlds: [makeWorld()],
      learningPacks: [makePack('ocean-giants', 1)],
      discoveries: [makeDiscovery('blue-whale')],
      memberships: [membership('ocean-giants', 'blue-whale', 1)],
    });
    const progress = new InMemoryProgressRepository();
    const service = new DiscoveryProgressService({
      content,
      progress,
      syncQueue: queue,
      now: () => timestamp,
    });

    await expect(
      service.revealDiscovery({ explorerId, learningPackId: packId, discoveryId }),
    ).rejects.toThrow('controlled outbox failure');
    expect(await progress.getDiscoveryProgress(explorerId, discoveryId)).toBeNull();
    expect(await progress.getLearningPackProgress(explorerId, packId)).toBeNull();
  });
});
