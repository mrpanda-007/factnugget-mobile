import { describe, expect, it, vi } from 'vitest';

import { BackupSetupService } from '../application/sync/BackupSetupService';
import type { CloudAccountBinding } from '../types/domain/cloud';
import { parseAuthUserId, parseFamilyId } from '../types/domain/ids';

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));

const timestamp = '2026-08-18T00:00:00.000Z';
const authUserId = parseAuthUserId('parent-a');
const familyId = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const explorerA = '00000000-0000-4000-8000-000000000001';
const explorerB = '00000000-0000-4000-8000-000000000002';

function fixtureDatabase() {
  let bound = false;
  const outbox: { familyId: string; entityType: string; entityId: string }[] = [];
  const tables = {
    explorers: [{ id: explorerA }, { id: explorerB }],
    discovery: [{ explorer_id: explorerA, discovery_id: 'blue-whale' }],
    packDiscovery: [
      { explorer_id: explorerA, learning_pack_id: 'ocean-basics', discovery_id: 'blue-whale' },
    ],
    packs: [{ explorer_id: explorerB, learning_pack_id: 'space-basics' }],
    badges: [{ explorer_id: explorerB, world_id: 'space' }],
  };
  const database = {
    async withTransactionAsync(work: () => Promise<void>) {
      const bindingBefore = bound;
      const outboxBefore = [...outbox];
      try {
        await work();
      } catch (error) {
        bound = bindingBefore;
        outbox.splice(0, outbox.length, ...outboxBefore);
        throw error;
      }
    },
    async getAllAsync(query: string) {
      if (query.includes('FROM local_explorers')) return tables.explorers;
      if (query.includes('FROM discovery_progress')) return tables.discovery;
      if (query.includes('FROM pack_discovery_progress')) return tables.packDiscovery;
      if (query.includes('FROM learning_pack_progress')) return tables.packs;
      if (query.includes('FROM earned_badges')) return tables.badges;
      return [];
    },
    async runAsync(query: string, ...args: string[]) {
      if (query.includes('INSERT INTO cloud_account_binding')) {
        bound = true;
        return;
      }
      if (query.includes('INSERT INTO sync_outbox')) {
        const [, nextFamilyId, entityType, entityId] = args;
        if (
          !outbox.some(
            (row) =>
              row.familyId === nextFamilyId &&
              row.entityType === entityType &&
              row.entityId === entityId,
          )
        ) {
          outbox.push({ familyId: nextFamilyId, entityType, entityId });
        }
      }
    },
  };
  return {
    database,
    outbox,
    get bound() {
      return bound;
    },
  };
}

function createService(
  database: ReturnType<typeof fixtureDatabase>,
  binding: CloudAccountBinding = { state: 'unbound' },
  failAt?: number,
) {
  let seeded = 0;
  return new BackupSetupService({
    database: async () => database.database as never,
    bindings: {
      getCurrentBinding: async () => binding,
      bind: async () => binding,
      replaceBinding: async () => binding,
      detach: async () => undefined,
    },
    outbox: {
      enqueue: async () => {
        throw new Error('not used');
      },
      listPending: async () => [],
      countPending: async () => database.outbox.length,
      removeDelivered: async () => undefined,
      recordAttemptFailure: async () => undefined,
    },
    sync: {
      pushPending: async () => ({ state: 'success' as const }),
      pullExplorer: async () => ({ state: 'success' as const }),
    },
    now: () => timestamp,
    beforeSeedReference: () => {
      seeded += 1;
      if (seeded === failAt) throw new Error('forced seed interruption');
    },
  });
}

describe('Phase 9F atomic historical backup seeding', () => {
  it('seeds every supported local educational entity and no entitlement/settings data', async () => {
    const database = fixtureDatabase();
    const result = await createService(database).bindAndSeed(authUserId, familyId);
    expect(result).toMatchObject({
      state: 'ready',
      pendingCount: 6,
      explorerIds: [explorerA, explorerB],
    });
    expect(database.bound).toBe(true);
    expect(database.outbox).toEqual(
      expect.arrayContaining([
        { familyId, entityType: 'explorer', entityId: explorerA },
        { familyId, entityType: 'explorer', entityId: explorerB },
        { familyId, entityType: 'discoveryProgress', entityId: `${explorerA}__blue-whale` },
        {
          familyId,
          entityType: 'packDiscoveryProgress',
          entityId: `${explorerA}__ocean-basics__blue-whale`,
        },
        { familyId, entityType: 'learningPackProgress', entityId: `${explorerB}__space-basics` },
        { familyId, entityType: 'earnedBadge', entityId: `${explorerB}__space` },
      ]),
    );
  });

  it('rolls back both binding and every seed row if interrupted, and later reseeding coalesces', async () => {
    const interrupted = fixtureDatabase();
    expect(
      await createService(interrupted, { state: 'unbound' }, 3).bindAndSeed(authUserId, familyId),
    ).toEqual({ state: 'failure', error: 'localFailure' });
    expect(interrupted.bound).toBe(false);
    expect(interrupted.outbox).toEqual([]);

    const recovered = fixtureDatabase();
    const bound: CloudAccountBinding = {
      state: 'bound',
      authUserId,
      familyId,
      boundAt: timestamp,
      updatedAt: timestamp,
    };
    const service = createService(recovered, bound);
    await service.bindAndSeed(authUserId, familyId);
    await service.bindAndSeed(authUserId, familyId);
    expect(recovered.outbox).toHaveLength(6);
  });
});
