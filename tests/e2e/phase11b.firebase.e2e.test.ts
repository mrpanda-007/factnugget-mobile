import { readFileSync } from 'node:fs';

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoveryProgressService } from '../../application/DiscoveryProgressService';
import { BackupSetupService } from '../../application/sync/BackupSetupService';
import { CloudSyncService } from '../../application/sync/CloudSyncService';
import { LocalSyncQueueService } from '../../application/sync/LocalSyncQueueService';
import { RemoteExplorerImportService } from '../../application/sync/RemoteExplorerImportService';
import { initializeDatabase } from '../../database/client';
import { FirestoreCloudSyncRepository } from '../../repositories/adapters/FirestoreCloudSyncRepository';
import { SQLiteCloudAccountBindingRepository } from '../../repositories/adapters/SQLiteCloudAccountBindingRepository';
import { SQLiteCloudSyncStateRepository } from '../../repositories/adapters/SQLiteCloudSyncStateRepository';
import { SQLiteEntitlementRepository } from '../../repositories/adapters/SQLiteEntitlementRepository';
import { SQLiteExplorerRepository } from '../../repositories/adapters/SQLiteExplorerRepository';
import { SQLiteProgressRepository } from '../../repositories/adapters/SQLiteProgressRepository';
import { SQLiteSyncOutboxRepository } from '../../repositories/adapters/SQLiteSyncOutboxRepository';
import type { ParentAuthSession } from '../../types/domain/cloud';
import { parseAuthUserId, parseFamilyId } from '../../types/domain/ids';
import { InMemoryContentRepository } from '../helpers/InMemoryRepositories';
import { blueWhaleId, oceanGiantsPackId, sharedDiscoverySeed } from '../helpers/fixtures';
import {
  createTemporarySQLiteDatabase,
  type TemporarySQLiteDatabase,
} from '../helpers/NodeSQLiteDatabase';

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));

const enabled = process.env.PHASE11B_EMULATOR_TEST === 'true';
const projectId = 'demo-factnuggets-phase11b';
const authPort = 19099;
const functionsPort = 15001;
const revealedAt = '2026-08-19T00:00:00.000Z';
const collectedAt = '2026-08-19T01:00:00.000Z';
let environment: RulesTestEnvironment;
const firebaseApps: FirebaseApp[] = [];
const databases: TemporarySQLiteDatabase[] = [];

async function device() {
  const value = await createTemporarySQLiteDatabase();
  databases.push(value);
  await initializeDatabase(value.database.asExpoDatabase());
  const database = async () => value.database.asExpoDatabase();
  return {
    value,
    database,
    explorers: new SQLiteExplorerRepository(database),
    progress: new SQLiteProgressRepository(database),
    bindings: new SQLiteCloudAccountBindingRepository(database),
    outbox: new SQLiteSyncOutboxRepository(database),
    localState: new SQLiteCloudSyncStateRepository(database),
    entitlements: new SQLiteEntitlementRepository({ database }),
  };
}

async function parent() {
  const label = `phase11b-${Date.now()}-${Math.random()}`;
  const app = initializeApp(
    { apiKey: 'test-key', authDomain: 'localhost', projectId, appId: label },
    label,
  );
  firebaseApps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(
    auth,
    `${label}@example.test`,
    'phase11b-test-password',
  );
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', functionsPort);
  const authUserId = parseAuthUserId(credential.user.uid);
  const session: ParentAuthSession = {
    authUserId,
    email: credential.user.email,
    emailVerified: credential.user.emailVerified,
    createdAt: credential.user.metadata.creationTime
      ? new Date(credential.user.metadata.creationTime).toISOString()
      : revealedAt,
  };
  return { functions, authUserId, session };
}

describe.skipIf(!enabled)('Phase 11B Firebase emulator E2E', () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
  });

  beforeEach(async () => environment.clearFirestore());

  afterEach(async () => {
    await Promise.all(databases.splice(0).map((database) => database.cleanup()));
    await Promise.all(firebaseApps.splice(0).map(deleteApp));
  });

  afterAll(async () => environment.cleanup());

  it('bootstraps, backs up real SQLite state, imports on Device B, and converges monotonically', async () => {
    const parentAccount = await parent();
    expect((await httpsCallable(parentAccount.functions, 'getMyFamilyStatus')({})).data).toEqual({
      state: 'none',
    });
    const created = (await httpsCallable(parentAccount.functions, 'createMyFamily')({})).data as {
      state: string;
      familyId: string;
    };
    const familyId = parseFamilyId(created.familyId);
    expect(familyId).not.toBe(parentAccount.authUserId);
    expect((await httpsCallable(parentAccount.functions, 'createMyFamily')({})).data).toMatchObject(
      { familyId },
    );

    const firestore = environment.authenticatedContext(parentAccount.authUserId).firestore();
    const cloud = new FirestoreCloudSyncRepository(firestore as never);
    const sessionReader = { getSession: async () => parentAccount.session };
    const content = new InMemoryContentRepository(sharedDiscoverySeed());

    const deviceA = await device();
    const explorer = await deviceA.explorers.createExplorer('animal');
    await deviceA.explorers.setActiveExplorer(explorer.id);
    const localChildA = new DiscoveryProgressService({
      content,
      progress: deviceA.progress,
      now: () => revealedAt,
    });
    await localChildA.revealDiscovery({
      explorerId: explorer.id,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });

    const syncA = new CloudSyncService({
      bindings: deviceA.bindings,
      outbox: deviceA.outbox,
      localState: deviceA.localState,
      cloud,
      session: sessionReader,
      now: () => revealedAt,
    });
    const setupA = new BackupSetupService({
      database: deviceA.database,
      bindings: deviceA.bindings,
      outbox: deviceA.outbox,
      sync: syncA,
      now: () => revealedAt,
    });
    const seeded = await setupA.bindAndSeed(parentAccount.authUserId, familyId);
    expect(seeded).toMatchObject({ state: 'ready', explorerIds: [explorer.id] });
    expect(await setupA.syncSeeded([explorer.id])).toMatchObject({
      state: 'success',
      remainingPending: 0,
    });
    expect(await deviceA.outbox.countPending(familyId)).toBe(0);

    const deviceB = await device();
    await deviceB.bindings.bind({
      authUserId: parentAccount.authUserId,
      familyId,
      boundAt: revealedAt,
    });
    const importer = new RemoteExplorerImportService({
      bindings: deviceB.bindings,
      cloud,
      localState: deviceB.localState,
      session: sessionReader,
    });
    expect(await importer.listAvailable()).toEqual([
      { explorerId: explorer.id, lookId: 'animal', createdAt: explorer.createdAt },
    ]);
    expect(await importer.importExplorer(explorer.id)).toEqual({
      state: 'success',
      explorerId: explorer.id,
      mergedExisting: false,
    });
    expect((await deviceB.explorers.getActiveState()).explorer).toBeNull();
    expect(await deviceB.entitlements.listEntitlements()).toEqual([]);
    expect(await deviceB.outbox.countPending(familyId)).toBe(0);

    const localChildB = new DiscoveryProgressService({
      content,
      progress: deviceB.progress,
      syncQueue: new LocalSyncQueueService(deviceB.bindings, deviceB.outbox, () => collectedAt),
      now: () => collectedAt,
    });
    await localChildB.collectDiscovery({
      explorerId: explorer.id,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(await deviceB.outbox.countPending(familyId)).toBe(3);
    const syncB = new CloudSyncService({
      bindings: deviceB.bindings,
      outbox: deviceB.outbox,
      localState: deviceB.localState,
      cloud,
      session: sessionReader,
      now: () => collectedAt,
    });
    expect(await syncB.pushPending()).toMatchObject({ state: 'success', remainingPending: 0 });
    expect(await syncA.pullExplorer(explorer.id)).toMatchObject({ state: 'success' });
    expect(await deviceA.progress.getDiscoveryProgress(explorer.id, blueWhaleId)).toMatchObject({
      revealedAt,
      collectedAt,
    });
    expect(await deviceA.outbox.countPending(familyId)).toBe(0);
  });
});
