import { afterEach, describe, expect, it, vi } from 'vitest';

import { DiscoveryProgressService } from '../../application/DiscoveryProgressService';
import { CommerceService } from '../../application/commerce/CommerceService';
import { LearningPackAccessService } from '../../application/commerce/LearningPackAccessService';
import { AccountSwitchService } from '../../application/sync/AccountSwitchService';
import { BackupSetupService } from '../../application/sync/BackupSetupService';
import { CloudSyncService } from '../../application/sync/CloudSyncService';
import { LocalSyncQueueService } from '../../application/sync/LocalSyncQueueService';
import { RemoteExplorerImportService } from '../../application/sync/RemoteExplorerImportService';
import { initializeDatabase } from '../../database/client';
import { V2_SCHEMA_STATEMENTS, migrations } from '../../database/schema';
import { SQLiteCloudAccountBindingRepository } from '../../repositories/adapters/SQLiteCloudAccountBindingRepository';
import { SQLiteCloudSyncStateRepository } from '../../repositories/adapters/SQLiteCloudSyncStateRepository';
import { SQLiteEntitlementRepository } from '../../repositories/adapters/SQLiteEntitlementRepository';
import { SQLiteExplorerRepository } from '../../repositories/adapters/SQLiteExplorerRepository';
import { SQLiteProgressRepository } from '../../repositories/adapters/SQLiteProgressRepository';
import { SQLiteSyncOutboxRepository } from '../../repositories/adapters/SQLiteSyncOutboxRepository';
import type { CloudSyncRepositoryContract } from '../../repositories/contracts/CloudSyncRepositoryContract';
import type { PurchaseProviderContract } from '../../repositories/contracts/PurchaseProviderContract';
import type { ParentAuthSession } from '../../types/domain/cloud';
import {
  parseAuthUserId,
  parseCommerceKey,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
  parseLearningPackId,
  parsePlatformProductId,
} from '../../types/domain/ids';
import { InMemoryContentRepository } from '../helpers/InMemoryRepositories';
import {
  amazingMammalsPackId,
  blueWhaleId,
  dolphinId,
  oceanGiantsPackId,
  oceanWorldId,
  sharedDiscoverySeed,
} from '../helpers/fixtures';
import {
  createTemporarySQLiteDatabase,
  type TemporarySQLiteDatabase,
} from '../helpers/NodeSQLiteDatabase';

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));

const timestamp = '2026-08-19T00:00:00.000Z';
const later = '2026-08-19T01:00:00.000Z';
const authUserId = parseAuthUserId('phase11b-parent-a');
const familyA = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const familyB = parseFamilyId('00000000-0000-4000-8000-0000000000b2');
const session: ParentAuthSession = {
  authUserId,
  email: 'phase11b@example.test',
  emailVerified: true,
  createdAt: timestamp,
};
const databases: TemporarySQLiteDatabase[] = [];

async function freshDatabase(): Promise<TemporarySQLiteDatabase> {
  const value = await createTemporarySQLiteDatabase();
  databases.push(value);
  await initializeDatabase(value.database.asExpoDatabase());
  return value;
}

function repositories(value: TemporarySQLiteDatabase) {
  const database = async () => value.database.asExpoDatabase();
  return {
    database,
    explorers: new SQLiteExplorerRepository(database),
    progress: new SQLiteProgressRepository(database),
    bindings: new SQLiteCloudAccountBindingRepository(database),
    outbox: new SQLiteSyncOutboxRepository(database),
    localState: new SQLiteCloudSyncStateRepository(database),
    entitlements: new SQLiteEntitlementRepository({ database, now: () => timestamp }),
  };
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.cleanup()));
});

describe('Phase 11B local integrated E2E', () => {
  it('starts local-only on schema v5 with no cloud, queue, entitlement, or active Explorer', async () => {
    const value = await freshDatabase();
    const repo = repositories(value);
    expect(
      await value.database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'),
    ).toEqual({ user_version: 5 });
    expect(await repo.explorers.getActiveState()).toEqual({ explorer: null, soundEnabled: false });
    expect(await repo.bindings.getCurrentBinding()).toEqual({ state: 'unbound' });
    expect(await repo.outbox.countPending(familyA)).toBe(0);
    expect(await repo.entitlements.listEntitlements()).toEqual([]);
  });

  it('persists reveal/collect separation, Pack context, one Badge, settings, and queue across restart', async () => {
    const value = await freshDatabase();
    let repo = repositories(value);
    const explorer = await repo.explorers.createExplorer('animal');
    await repo.explorers.setActiveExplorer(explorer.id);
    await repo.explorers.setSoundEnabled(true);
    await repo.bindings.bind({ authUserId, familyId: familyA, boundAt: timestamp });
    const content = new InMemoryContentRepository(sharedDiscoverySeed());
    const service = new DiscoveryProgressService({
      content,
      progress: repo.progress,
      syncQueue: new LocalSyncQueueService(repo.bindings, repo.outbox, () => timestamp),
      now: () => timestamp,
    });

    await service.revealDiscovery({
      explorerId: explorer.id,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(await repo.progress.getDiscoveryProgress(explorer.id, blueWhaleId)).toMatchObject({
      revealedAt: timestamp,
      collectedAt: null,
    });
    expect(await repo.outbox.countPending(familyA)).toBe(3);

    await service.collectDiscovery({
      explorerId: explorer.id,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(
      await repo.progress.getPackDiscoveryProgress(explorer.id, amazingMammalsPackId, blueWhaleId),
    ).toBeNull();
    await service.collectDiscovery({
      explorerId: explorer.id,
      learningPackId: oceanGiantsPackId,
      discoveryId: sharedDiscoverySeed().discoveries[1].id,
    });
    await service.collectDiscovery({
      explorerId: explorer.id,
      learningPackId: amazingMammalsPackId,
      discoveryId: blueWhaleId,
    });
    const completed = await service.collectDiscovery({
      explorerId: explorer.id,
      learningPackId: amazingMammalsPackId,
      discoveryId: dolphinId,
    });
    expect(completed.worldBadgeEarnedNow).toBe(true);
    expect(await repo.progress.listEarnedBadges(explorer.id)).toHaveLength(1);
    expect(
      await service.collectDiscovery({
        explorerId: explorer.id,
        learningPackId: amazingMammalsPackId,
        discoveryId: dolphinId,
      }),
    ).toMatchObject({ worldBadgeEarnedNow: false });

    value.reopen();
    repo = repositories(value);
    expect(await repo.explorers.getActiveState()).toMatchObject({
      explorer: { id: explorer.id },
      soundEnabled: true,
    });
    expect(await repo.progress.listEarnedBadges(explorer.id)).toHaveLength(1);
    expect(await repo.outbox.countPending(familyA)).toBeGreaterThan(0);
  });

  it('keeps paid access Store-local and independent from cloud binding changes', async () => {
    const value = await freshDatabase();
    const repo = repositories(value);
    const contentSeed = sharedDiscoverySeed();
    const paidPack = {
      ...contentSeed.learningPacks[0],
      id: parseLearningPackId('space-adventures'),
      accessType: 'paid' as const,
      commerceKey: parseCommerceKey('space-adventures-one-time'),
    };
    const content = new InMemoryContentRepository({
      ...contentSeed,
      learningPacks: [paidPack, contentSeed.learningPacks[1]],
    });
    const access = new LearningPackAccessService(content, repo.entitlements);
    expect(await access.getLearningPackAccess(paidPack.id)).toMatchObject({ state: 'locked' });

    const owned = {
      commerceKey: paidPack.commerceKey,
      platformProductId: parsePlatformProductId('pack_space_adventures'),
      source: 'google' as const,
      status: 'active' as const,
      grantedAt: timestamp,
      expiresAt: null,
      lastVerifiedAt: timestamp,
      sourceReferenceHash: 'test-hash-not-a-receipt',
    };
    const provider: PurchaseProviderContract = {
      loadStoreProducts: async () => ({
        state: 'unavailable',
        code: 'store-unavailable',
        retryable: true,
      }),
      purchase: async () => ({ state: 'success', commerceKey: paidPack.commerceKey }),
      reconcileOwnedPurchases: async () => ({
        state: 'success',
        purchases: [owned],
        unknownProductIds: [],
      }),
      restorePurchases: async () => ({
        state: 'success',
        purchases: [owned],
        unknownProductIds: [],
      }),
      finishReconciledPurchases: async () => undefined,
    };
    const commerce = new CommerceService(
      provider,
      repo.entitlements,
      () => paidPack.id,
      () => later,
    );
    expect(await commerce.purchase(paidPack.commerceKey)).toMatchObject({ state: 'success' });
    expect(await access.getLearningPackAccess(paidPack.id)).toMatchObject({ state: 'allowed' });

    await repo.bindings.bind({ authUserId, familyId: familyA, boundAt: timestamp });
    await repo.bindings.replaceBinding({
      authUserId: parseAuthUserId('phase11b-parent-b'),
      familyId: familyB,
      boundAt: later,
      expectedAuthUserId: authUserId,
      expectedFamilyId: familyA,
    });
    expect(await access.getLearningPackAccess(paidPack.id)).toMatchObject({ state: 'allowed' });
    expect(await repo.entitlements.listEntitlements()).toHaveLength(1);
  });

  it('seeds approved historical education state only and retains failed pushes for retry', async () => {
    const value = await freshDatabase();
    const repo = repositories(value);
    const explorer = await repo.explorers.createExplorer('animal');
    await repo.explorers.setActiveExplorer(explorer.id);
    await repo.progress.collectDiscovery({
      explorerId: explorer.id,
      discoveryId: blueWhaleId,
      occurredAt: timestamp,
    });
    await repo.progress.startOrTouchLearningPack(explorer.id, oceanGiantsPackId, timestamp);
    await repo.progress.earnWorldBadge(explorer.id, oceanWorldId, 'world-1', timestamp);
    await repo.entitlements.upsertEntitlement({
      id: '00000000-0000-4000-8000-0000000000e1' as never,
      subject: { type: 'learningPack', id: oceanGiantsPackId },
      source: 'google',
      status: 'active',
      grantedAt: timestamp,
      expiresAt: null,
      lastVerifiedAt: timestamp,
      sourceReferenceHash: 'local-only',
      updatedAt: timestamp,
    });
    const setup = new BackupSetupService({
      database: repo.database,
      bindings: repo.bindings,
      outbox: repo.outbox,
      sync: {
        pushPending: async () => ({ state: 'failure', error: 'offline' }),
        pullExplorer: async () => ({ state: 'failure', error: 'offline' }),
      },
      now: () => timestamp,
    });
    expect(await setup.bindAndSeed(authUserId, familyA)).toMatchObject({ state: 'ready' });
    const rows = await repo.outbox.listPending(familyA, 20);
    expect(rows.map((row) => row.entityType).sort()).toEqual([
      'discoveryProgress',
      'earnedBadge',
      'explorer',
      'learningPackProgress',
    ]);
    expect(JSON.stringify(rows)).not.toContain('entitlement');
    expect(JSON.stringify(rows)).not.toContain('activeExplorerId');

    const cloud: CloudSyncRepositoryContract = {
      getFamily: async () => null,
      getFamilyMembership: async () => ({
        familyId: familyA,
        authUserId,
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      }),
      listFamilyExplorers: async () => [],
      pullExplorerState: async () => null,
      upsertExplorer: async () => ({ state: 'failure', error: 'offline' }),
      upsertDiscoveryProgress: async () => ({ state: 'failure', error: 'offline' }),
      upsertPackDiscoveryProgress: async () => ({ state: 'failure', error: 'offline' }),
      upsertLearningPackProgress: async () => ({ state: 'failure', error: 'offline' }),
      upsertBadge: async () => ({ state: 'failure', error: 'offline' }),
    };
    const sync = new CloudSyncService({
      bindings: repo.bindings,
      outbox: repo.outbox,
      localState: repo.localState,
      cloud,
      session: { getSession: async () => session },
      now: () => later,
    });
    expect(await sync.pushPending()).toMatchObject({ state: 'failure', error: 'offline' });
    const retained = await repo.outbox.listPending(familyA, 20);
    expect(retained).toHaveLength(rows.length);
    expect(retained.every((row) => row.attemptCount === 1 && row.lastErrorCode === 'offline')).toBe(
      true,
    );
  });

  it('retries idempotently when remote commit succeeds before the local outbox acknowledgement', async () => {
    const value = await freshDatabase();
    const repo = repositories(value);
    const explorer = await repo.explorers.createExplorer('animal');
    await repo.bindings.bind({ authUserId, familyId: familyA, boundAt: timestamp });
    await repo.outbox.enqueue({
      operationId: 'interrupted-ack-operation',
      familyId: familyA,
      entityType: 'explorer',
      entityId: explorer.id,
      createdAt: timestamp,
    });
    let remoteWrites = 0;
    const cloud: CloudSyncRepositoryContract = {
      getFamily: async () => null,
      getFamilyMembership: async () => ({
        familyId: familyA,
        authUserId,
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      }),
      listFamilyExplorers: async () => [],
      pullExplorerState: async () => null,
      upsertExplorer: async () => {
        remoteWrites += 1;
        return { state: 'success' };
      },
      upsertDiscoveryProgress: async () => ({ state: 'success' }),
      upsertPackDiscoveryProgress: async () => ({ state: 'success' }),
      upsertLearningPackProgress: async () => ({ state: 'success' }),
      upsertBadge: async () => ({ state: 'success' }),
    };
    const originalRemove = repo.outbox.removeDelivered.bind(repo.outbox);
    repo.outbox.removeDelivered = async () => {
      throw new Error('injected crash before local acknowledgement');
    };
    const sync = new CloudSyncService({
      bindings: repo.bindings,
      outbox: repo.outbox,
      localState: repo.localState,
      cloud,
      session: { getSession: async () => session },
      now: () => later,
    });
    expect(await sync.pushPending()).toMatchObject({
      state: 'failure',
      error: 'unknownFailure',
      remainingPending: 1,
    });
    expect(await repo.outbox.countPending(familyA)).toBe(1);
    repo.outbox.removeDelivered = originalRemove;
    expect(await sync.pushPending()).toMatchObject({ state: 'success', remainingPending: 0 });
    expect(remoteWrites).toBe(2);
  });

  it('keeps old-family rows immutable through explicit account switching and switch failure', async () => {
    const value = await freshDatabase();
    const repo = repositories(value);
    await repo.bindings.bind({ authUserId, familyId: familyA, boundAt: timestamp });
    await repo.outbox.enqueue({
      operationId: 'old-operation',
      familyId: familyA,
      entityType: 'explorer',
      entityId: '00000000-0000-4000-8000-000000000001',
      createdAt: timestamp,
    });
    const userB = parseAuthUserId('phase11b-parent-b');
    const service = new AccountSwitchService({
      bindings: repo.bindings,
      outbox: repo.outbox,
      session: { getSession: async () => ({ ...session, authUserId: userB }) },
      bootstrap: {
        getMyFamilyStatus: async () => ({ state: 'exists', familyId: familyB }),
        createMyFamily: async () => ({ state: 'success', familyId: familyB }),
      },
      now: () => later,
    });
    expect(await service.prepare()).toEqual({
      state: 'ready',
      targetFamilyId: familyB,
      pendingOldChanges: 1,
    });
    expect(await service.finalize(familyB)).toEqual({ state: 'success', familyId: familyB });
    expect(await repo.outbox.countPending(familyA)).toBe(1);
    expect(await repo.outbox.countPending(familyB)).toBe(0);

    const original = repo.bindings.replaceBinding.bind(repo.bindings);
    repo.bindings.replaceBinding = async () => {
      throw new Error('injected replacement failure');
    };
    const switchBack = new AccountSwitchService({
      bindings: repo.bindings,
      outbox: repo.outbox,
      session: { getSession: async () => session },
      bootstrap: {
        getMyFamilyStatus: async () => ({ state: 'exists', familyId: familyA }),
        createMyFamily: async () => ({ state: 'success', familyId: familyA }),
      },
    });
    expect(await switchBack.finalize(familyA)).toEqual({
      state: 'failure',
      error: 'unknownFailure',
    });
    repo.bindings.replaceBinding = original;
    expect(await repo.bindings.getCurrentBinding()).toMatchObject({ familyId: familyB });
  });

  it('rolls back every actual SQLite write when a remote Explorer import is interrupted', async () => {
    const value = await freshDatabase();
    const repo = repositories(value);
    await repo.bindings.bind({ authUserId, familyId: familyA, boundAt: timestamp });
    const remoteExplorerId = parseExplorerId('00000000-0000-4000-8000-000000000009');
    const remoteDiscoveryId = parseDiscoveryId('retired-valid-discovery');
    const originalApplyLearningPack = repo.localState.applyLearningPack.bind(repo.localState);
    repo.localState.applyLearningPack = async () => {
      throw new Error('injected import interruption');
    };
    const remoteExplorer = {
      explorerId: remoteExplorerId,
      lookId: 'animal' as const,
      createdAt: timestamp,
      schemaVersion: 1 as const,
    };
    const cloud: CloudSyncRepositoryContract = {
      getFamily: async () => null,
      getFamilyMembership: async () => ({
        familyId: familyA,
        authUserId,
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      }),
      listFamilyExplorers: async () => [remoteExplorer],
      pullExplorerState: async () => ({
        explorer: remoteExplorer,
        discoveryProgress: [
          {
            explorerId: remoteExplorerId,
            discoveryId: remoteDiscoveryId,
            revealedAt: timestamp,
            collectedAt: later,
            schemaVersion: 1,
          },
        ],
        packDiscoveryProgress: [],
        learningPackProgress: [
          {
            explorerId: remoteExplorerId,
            learningPackId: oceanGiantsPackId,
            startedAt: timestamp,
            lastViewedAt: later,
            completedAt: null,
            completionRevision: null,
            schemaVersion: 1,
          },
        ],
        earnedBadges: [],
      }),
      upsertExplorer: async () => ({ state: 'success' }),
      upsertDiscoveryProgress: async () => ({ state: 'success' }),
      upsertPackDiscoveryProgress: async () => ({ state: 'success' }),
      upsertLearningPackProgress: async () => ({ state: 'success' }),
      upsertBadge: async () => ({ state: 'success' }),
    };
    const importer = new RemoteExplorerImportService({
      bindings: repo.bindings,
      cloud,
      localState: repo.localState,
      session: { getSession: async () => session },
    });
    expect(await importer.importExplorer(remoteExplorerId)).toEqual({
      state: 'failure',
      error: 'unknownFailure',
    });
    repo.localState.applyLearningPack = originalApplyLearningPack;
    expect(await repo.localState.getExplorer(remoteExplorerId)).toBeNull();
    expect(
      await value.database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM discovery_progress WHERE explorer_id = ?;',
        remoteExplorerId,
      ),
    ).toEqual({ count: 0 });
    expect(await repo.outbox.countPending(familyA)).toBe(0);
  });

  it('migrates v3 into the current runtime and rolls back an injected v4 failure without reset', async () => {
    const migrated = await createTemporarySQLiteDatabase();
    databases.push(migrated);
    const db = migrated.database;
    await db.execAsync(migrations[0].statements.join('\n'));
    await db.execAsync(V2_SCHEMA_STATEMENTS.join('\n'));
    await db.execAsync(
      migrations.find((migration) => migration.version === 3)!.statements.join('\n'),
    );
    await db.execAsync('PRAGMA user_version = 3;');
    await db.runAsync(
      'INSERT INTO local_explorers (id, look_id, created_at, updated_at) VALUES (?, ?, ?, ?);',
      '00000000-0000-4000-8000-000000000001',
      'animal',
      timestamp,
      timestamp,
    );
    await db.runAsync(
      'INSERT INTO device_settings (id, active_explorer_id, sound_enabled, updated_at) VALUES (1, ?, 1, ?);',
      '00000000-0000-4000-8000-000000000001',
      timestamp,
    );
    await initializeDatabase(db.asExpoDatabase());
    const repo = repositories(migrated);
    const setup = new BackupSetupService({
      database: repo.database,
      bindings: repo.bindings,
      outbox: repo.outbox,
      sync: {
        pushPending: async () => ({ state: 'failure', error: 'offline' }),
        pullExplorer: async () => ({ state: 'failure', error: 'offline' }),
      },
      now: () => timestamp,
    });
    expect(await setup.bindAndSeed(authUserId, familyA)).toMatchObject({
      state: 'ready',
      pendingCount: 1,
    });
    expect(await repo.outbox.countPending(familyA)).toBe(1);
    expect(await repo.explorers.getActiveState()).toMatchObject({ soundEnabled: true });

    const rollback = await createTemporarySQLiteDatabase();
    databases.push(rollback);
    await rollback.database.execAsync(migrations[0].statements.join('\n'));
    await rollback.database.execAsync(V2_SCHEMA_STATEMENTS.join('\n'));
    await rollback.database.execAsync(
      migrations.find((migration) => migration.version === 3)!.statements.join('\n'),
    );
    await rollback.database.execAsync('PRAGMA user_version = 3;');
    await expect(
      initializeDatabase(rollback.database.asExpoDatabase(), {
        beforeVersionFourCommit: () => {
          throw new Error('injected migration interruption');
        },
      }),
    ).rejects.toThrow('injected migration interruption');
    expect(
      await rollback.database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'),
    ).toEqual({ user_version: 3 });
    expect(
      await rollback.database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'sync_outbox';",
      ),
    ).toEqual({ count: 0 });
  });
});
