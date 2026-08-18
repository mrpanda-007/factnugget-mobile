import { describe, expect, it } from 'vitest';

import { CloudSyncService } from '../application/sync/CloudSyncService';
import type {
  LocalSyncEntity,
  SQLiteCloudSyncStateRepository,
} from '../repositories/adapters/SQLiteCloudSyncStateRepository';
import type { CloudAccountBindingRepositoryContract } from '../repositories/contracts/CloudAccountBindingRepositoryContract';
import type { CloudSyncRepositoryContract } from '../repositories/contracts/CloudSyncRepositoryContract';
import type { SyncOutboxRepositoryContract } from '../repositories/contracts/SyncOutboxRepositoryContract';
import type {
  CloudAccountBinding,
  CloudSyncError,
  ParentAuthSession,
  SyncOperation,
} from '../types/domain/cloud';
import type { CloudExplorerStateDto } from '../types/cloud/dto';
import {
  parseAuthUserId,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
} from '../types/domain/ids';

const familyId = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const explorerId = parseExplorerId('00000000-0000-4000-8000-000000000001');
const discoveryId = parseDiscoveryId('blue-whale');
const timestamp = '2026-08-18T00:00:00.000Z';
const session: ParentAuthSession = {
  authUserId: parseAuthUserId('parent-a'),
  email: null,
  emailVerified: true,
  createdAt: timestamp,
};

class MemoryOutbox implements SyncOutboxRepositoryContract {
  values: SyncOperation[] = [];
  failures: CloudSyncError[] = [];
  async enqueue(): Promise<SyncOperation> {
    throw new Error('not used');
  }
  async listPending(): Promise<SyncOperation[]> {
    return [...this.values];
  }
  async countPending(): Promise<number> {
    return this.values.length;
  }
  async removeDelivered(operationId: string): Promise<void> {
    this.values = this.values.filter((value) => value.operationId !== operationId);
  }
  async recordAttemptFailure(_operationId: string, error: CloudSyncError): Promise<void> {
    this.failures.push(error);
  }
}

class MemoryBindings implements CloudAccountBindingRepositoryContract {
  binding: CloudAccountBinding = {
    state: 'bound',
    authUserId: session.authUserId,
    familyId,
    boundAt: timestamp,
    updatedAt: timestamp,
  };
  async getCurrentBinding(): Promise<CloudAccountBinding> {
    return this.binding;
  }
  async bind(): Promise<CloudAccountBinding> {
    return this.binding;
  }
  async replaceBinding(): Promise<CloudAccountBinding> {
    return this.binding;
  }
  async detach(): Promise<void> {
    this.binding = { state: 'unbound' };
  }
}

function operation(): SyncOperation {
  return {
    operationId: 'operation-a',
    familyId,
    entityType: 'discoveryProgress',
    entityId: `${explorerId}__${discoveryId}`,
    operation: 'upsert',
    createdAt: timestamp,
    attemptCount: 0,
    lastAttemptAt: null,
    lastErrorCode: null,
  };
}

function localState(remoteCollectedAt: string | null = null) {
  const entity: LocalSyncEntity = {
    entityType: 'discoveryProgress',
    value: { explorerId, discoveryId, revealedAt: timestamp, collectedAt: remoteCollectedAt },
  };
  const applied: LocalSyncEntity[] = [];
  return {
    applied,
    state: {
      getExplorer: async () => ({
        id: explorerId,
        lookId: 'animal' as const,
        createdAt: timestamp,
      }),
      getEntity: async () => entity,
      withTransaction: async <T>(work: () => Promise<T>) => work(),
      applyDiscovery: async (value: LocalSyncEntity['value']) => {
        applied.push({ entityType: 'discoveryProgress', value: value as never });
      },
      applyPackDiscovery: async () => undefined,
      applyLearningPack: async () => undefined,
      applyBadge: async () => undefined,
    } as unknown as SQLiteCloudSyncStateRepository,
  };
}

function cloud(
  result: { state: 'success' } | { state: 'failure'; error: CloudSyncError } = { state: 'success' },
  remoteState: CloudExplorerStateDto | null = null,
) {
  let writes = 0;
  const repository: CloudSyncRepositoryContract = {
    getFamily: async () => null,
    getFamilyMembership: async () => ({
      familyId,
      authUserId: session.authUserId,
      role: 'parent',
      createdAt: timestamp,
      schemaVersion: 1,
    }),
    listFamilyExplorers: async () => [],
    pullExplorerState: async () => remoteState,
    upsertExplorer: async () => result,
    upsertDiscoveryProgress: async () => {
      writes += 1;
      return result;
    },
    upsertPackDiscoveryProgress: async () => result,
    upsertLearningPackProgress: async () => result,
    upsertBadge: async () => result,
  };
  return {
    repository,
    get writes() {
      return writes;
    },
  };
}

function stateWithDiscovery(collectedAt: string | null): CloudExplorerStateDto {
  return {
    explorer: { explorerId, lookId: 'animal', createdAt: timestamp, schemaVersion: 1 },
    discoveryProgress: [
      { explorerId, discoveryId, revealedAt: timestamp, collectedAt, schemaVersion: 1 },
    ],
    packDiscoveryProgress: [],
    learningPackProgress: [],
    earnedBadges: [],
  };
}

describe('Phase 9E CloudSyncService', () => {
  it('acknowledges an outbox entry only after its family-scoped cloud write succeeds', async () => {
    const outbox = new MemoryOutbox();
    outbox.values = [operation()];
    const local = localState();
    const remote = cloud();
    const service = new CloudSyncService({
      bindings: new MemoryBindings(),
      outbox,
      localState: local.state,
      cloud: remote.repository,
      session: { getSession: async () => session },
      now: () => timestamp,
    });
    expect(await service.pushPending()).toMatchObject({
      state: 'success',
      pushed: 1,
      remainingPending: 0,
    });
    expect(remote.writes).toBe(1);
    expect(outbox.values).toEqual([]);
  });

  it('retains a failed write and records only a normalized error', async () => {
    const outbox = new MemoryOutbox();
    outbox.values = [operation()];
    const local = localState();
    const remote = cloud({ state: 'failure', error: 'offline' });
    const service = new CloudSyncService({
      bindings: new MemoryBindings(),
      outbox,
      localState: local.state,
      cloud: remote.repository,
      session: { getSession: async () => session },
      now: () => timestamp,
    });
    expect(await service.pushPending()).toMatchObject({ state: 'failure', error: 'offline' });
    expect(outbox.values).toHaveLength(1);
    expect(outbox.failures).toEqual(['offline']);
  });

  it('fails closed before cloud access when the authenticated parent differs from the binding', async () => {
    const outbox = new MemoryOutbox();
    outbox.values = [operation()];
    const local = localState();
    const remote = cloud();
    const wrongSession = { ...session, authUserId: parseAuthUserId('parent-b') };
    const service = new CloudSyncService({
      bindings: new MemoryBindings(),
      outbox,
      localState: local.state,
      cloud: remote.repository,
      session: { getSession: async () => wrongSession },
    });
    expect(await service.pushPending()).toEqual({ state: 'failure', error: 'bindingMismatch' });
    expect(remote.writes).toBe(0);
    expect(outbox.values).toHaveLength(1);
  });

  it('pulls a remote collection advance without enqueuing an echo operation', async () => {
    const outbox = new MemoryOutbox();
    const local = localState(null);
    const remote = cloud({ state: 'success' }, stateWithDiscovery('2026-08-19T00:00:00.000Z'));
    const service = new CloudSyncService({
      bindings: new MemoryBindings(),
      outbox,
      localState: local.state,
      cloud: remote.repository,
      session: { getSession: async () => session },
    });
    expect(await service.pullExplorer(explorerId)).toMatchObject({ state: 'success', merged: 1 });
    expect(local.applied[0]).toMatchObject({
      entityType: 'discoveryProgress',
      value: { collectedAt: '2026-08-19T00:00:00.000Z' },
    });
    expect(outbox.values).toEqual([]);
  });

  it('keeps local monotonic collection when remote only contains a reveal', async () => {
    const outbox = new MemoryOutbox();
    const local = localState('2026-08-19T00:00:00.000Z');
    const remote = cloud({ state: 'success' }, stateWithDiscovery(null));
    const service = new CloudSyncService({
      bindings: new MemoryBindings(),
      outbox,
      localState: local.state,
      cloud: remote.repository,
      session: { getSession: async () => session },
    });
    await service.pullExplorer(explorerId);
    expect(local.applied[0]).toMatchObject({
      entityType: 'discoveryProgress',
      value: { collectedAt: '2026-08-19T00:00:00.000Z' },
    });
  });
});
