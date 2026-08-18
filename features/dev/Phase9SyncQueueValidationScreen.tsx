import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DiscoveryProgressService } from '../../application/DiscoveryProgressService';
import {
  LocalSyncQueueService,
  syncEntityReferences,
} from '../../application/sync/LocalSyncQueueService';
import { initializeDatabase } from '@database/client';
import { migrations, V2_SCHEMA_STATEMENTS } from '@database/schema';
import { SQLiteCloudAccountBindingRepository } from '@repositories/adapters/SQLiteCloudAccountBindingRepository';
import { SQLiteProgressRepository } from '@repositories/adapters/SQLiteProgressRepository';
import { SQLiteSyncOutboxRepository } from '@repositories/adapters/SQLiteSyncOutboxRepository';
import type { ContentRepositoryContract } from '@repositories/contracts/ContentRepositoryContract';
import type { Discovery, LearningPack, PackDiscovery, World } from '@app-types/domain/content';
import {
  parseAuthUserId,
  parseContentSlug,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
  parseLearningPackId,
  parseWorldId,
} from '@app-types/domain/ids';

const DATABASE_NAME = 'factnuggets-phase9-validation.db';
const TIME = '2026-08-18T00:00:00.000Z';
const explorerId = parseExplorerId('00000000-0000-4000-8000-000000000009');
const familyA = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const familyB = parseFamilyId('00000000-0000-4000-8000-0000000000b2');
const authA = parseAuthUserId('phase9-parent-a');
const authB = parseAuthUserId('phase9-parent-b');
const packId = parseLearningPackId('ocean-giants');
const discoveryId = parseDiscoveryId('blue-whale');
const worldId = parseWorldId('ocean');

interface Result {
  name: string;
  error?: string;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function resetDatabase(): Promise<SQLiteDatabase> {
  try {
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch (error) {
    if (!String(error).includes('not found')) throw error;
  }
  return openDatabaseAsync(DATABASE_NAME);
}

async function seedV3(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(migrations[0].statements.join('\n'));
  await db.runAsync(
    'INSERT INTO discovery_progress (discovery_id, deck_id, completed_at) VALUES (?, ?, ?);',
    'legacy-discovery',
    'legacy-pack',
    TIME,
  );
  await db.execAsync(V2_SCHEMA_STATEMENTS.join('\n'));
  await db.runAsync(
    'INSERT INTO local_explorers (id, look_id, created_at, updated_at) VALUES (?, ?, ?, ?);',
    explorerId,
    'animal',
    TIME,
    TIME,
  );
  await db.runAsync(
    'INSERT INTO device_settings (id, active_explorer_id, sound_enabled, updated_at) VALUES (1, ?, 1, ?);',
    explorerId,
    TIME,
  );
  await db.runAsync(
    `INSERT INTO discovery_progress (explorer_id, discovery_id, revealed_at, collected_at, updated_at)
     VALUES (?, ?, ?, ?, ?);`,
    explorerId,
    discoveryId,
    TIME,
    TIME,
    TIME,
  );
  await db.runAsync(
    `INSERT INTO pack_discovery_progress
     (explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    explorerId,
    packId,
    discoveryId,
    TIME,
    TIME,
    TIME,
  );
  await db.runAsync(
    `INSERT INTO learning_pack_progress
     (explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    explorerId,
    packId,
    TIME,
    TIME,
    TIME,
    '1',
    TIME,
  );
  await db.runAsync(
    'INSERT INTO earned_badges (explorer_id, world_id, earned_at, content_revision) VALUES (?, ?, ?, ?);',
    explorerId,
    worldId,
    TIME,
    '1',
  );
  await db.execAsync(
    migrations.find((migration) => migration.version === 3)!.statements.join('\n'),
  );
  await db.runAsync(
    `INSERT INTO local_entitlements
     (id, subject_type, subject_id, source, status, granted_at, expires_at, last_verified_at, source_reference_hash, updated_at)
     VALUES ('00000000-0000-4000-8000-000000000008', 'learningPack', ?, 'development', 'active', ?, NULL, ?, NULL, ?);`,
    packId,
    TIME,
    TIME,
    TIME,
  );
  await db.execAsync('PRAGMA user_version = 3;');
}

function contentFixture(): ContentRepositoryContract {
  const world: World = {
    id: worldId,
    slug: parseContentSlug('ocean'),
    title: 'Ocean',
    tagline: 'Ocean',
    themeKey: 'ocean',
    badge: { title: 'Ocean Badge', icon: '🏆', accessibleDescription: 'Ocean Badge' },
    sortOrder: 1,
    lifecycle: 'published',
    revision: '1',
  };
  const pack: LearningPack = {
    id: packId,
    slug: parseContentSlug('ocean-giants'),
    worldId,
    title: 'Ocean Giants',
    subtitle: '',
    sortOrder: 1,
    accessType: 'free',
    completionRole: 'required',
    lifecycle: 'published',
    revision: '1',
  };
  const discovery: Discovery = {
    id: discoveryId,
    slug: parseContentSlug('blue-whale'),
    title: 'Blue whale',
    subtitle: '',
    headlineFact: '',
    explanation: '',
    deeperExplanation: '',
    advancedExplanation: '',
    images: [],
    fallbackEmoji: '🐋',
    estimatedReadingSeconds: 1,
    lifecycle: 'published',
    revision: '1',
  };
  const membership: PackDiscovery = {
    discovery,
    membership: { learningPackId: packId, discoveryId, position: 1, completionRole: 'required' },
  };
  return {
    listWorlds: async () => [world],
    getWorld: async (id) => (id === worldId ? world : null),
    listLearningPacksForWorld: async (id) => (id === worldId ? [pack] : []),
    getLearningPack: async (id) => (id === packId ? pack : null),
    listPackDiscoveries: async (id) => (id === packId ? [membership] : []),
    getDiscovery: async (id) => (id === discoveryId ? discovery : null),
  };
}

async function runValidation(): Promise<Result[]> {
  const results: Result[] = [];
  const scenario = async (name: string, work: () => Promise<void>) => {
    try {
      await work();
      results.push({ name });
    } catch (error) {
      results.push({ name, error: error instanceof Error ? error.message : String(error) });
    }
  };

  await scenario('Fresh V4 is unbound with an empty outbox', async () => {
    const db = await resetDatabase();
    await initializeDatabase(db);
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        4,
      'database is not V4',
    );
    const bindings = new SQLiteCloudAccountBindingRepository(() => Promise.resolve(db));
    const outbox = new SQLiteSyncOutboxRepository(() => Promise.resolve(db));
    expect(
      (await bindings.getCurrentBinding()).state === 'unbound',
      'fresh binding is not unbound',
    );
    expect((await outbox.countPending(familyA)) === 0, 'fresh outbox is not empty');
    await db.closeAsync();
  });

  await scenario('V3 upgrade preserves state without inventing binding or queue rows', async () => {
    const db = await resetDatabase();
    await seedV3(db);
    await initializeDatabase(db);
    for (const table of [
      'local_explorers',
      'device_settings',
      'discovery_progress',
      'pack_discovery_progress',
      'learning_pack_progress',
      'earned_badges',
      'local_entitlements',
      'legacy_discovery_progress',
    ]) {
      expect((await db.getAllAsync(`SELECT * FROM ${table};`)).length > 0, `${table} was lost`);
    }
    const bindings = new SQLiteCloudAccountBindingRepository(() => Promise.resolve(db));
    const outbox = new SQLiteSyncOutboxRepository(() => Promise.resolve(db));
    expect(
      (await bindings.getCurrentBinding()).state === 'unbound',
      'migration invented a binding',
    );
    expect((await outbox.countPending(familyA)) === 0, 'migration invented queue rows');
    await db.closeAsync();
  });

  await scenario('V4 migration failure rolls back cleanly', async () => {
    const db = await resetDatabase();
    await seedV3(db);
    try {
      await initializeDatabase(db, {
        beforeVersionFourCommit: () => {
          throw new Error('rollback');
        },
      });
    } catch {
      // Expected: the migration transaction must leave the V3 fixture intact.
    }
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        3,
      'rollback advanced user_version',
    );
    expect(
      (await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_outbox';",
      )) === null,
      'rollback left sync_outbox behind',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM local_entitlements;')).length === 1,
      'V3 data changed',
    );
    await db.closeAsync();
  });

  await scenario(
    'Bound real discovery write, detach, family isolation, and restart durability',
    async () => {
      const db = await resetDatabase();
      await initializeDatabase(db);
      const database = () => Promise.resolve(db);
      const bindings = new SQLiteCloudAccountBindingRepository(database);
      const outbox = new SQLiteSyncOutboxRepository(database);
      const queue = new LocalSyncQueueService(bindings, outbox, () => TIME);
      const progress = new SQLiteProgressRepository(database);
      await db.runAsync(
        'INSERT INTO local_explorers (id, look_id, created_at, updated_at) VALUES (?, ?, ?, ?);',
        explorerId,
        'animal',
        TIME,
        TIME,
      );
      await bindings.bind({ authUserId: authA, familyId: familyA, boundAt: TIME });
      expect(
        (await bindings.bind({ authUserId: authA, familyId: familyA, boundAt: TIME })).state ===
          'bound',
        'same binding was not idempotent',
      );
      let differentFamilyRejected = false;
      try {
        await bindings.bind({ authUserId: authB, familyId: familyB, boundAt: TIME });
      } catch {
        differentFamilyRejected = true;
      }
      expect(differentFamilyRejected, 'different active family was not rejected');
      await new DiscoveryProgressService({
        content: contentFixture(),
        progress,
        syncQueue: queue,
        now: () => TIME,
      }).collectDiscovery({ explorerId, learningPackId: packId, discoveryId });
      expect(
        (await outbox.countPending(familyA)) === 4,
        'bound discovery did not enqueue four entities',
      );
      await bindings.detach();
      expect(
        (await progress.getDiscoveryProgress(explorerId, discoveryId))?.collectedAt === TIME,
        'detach changed local child progress',
      );
      await bindings.bind({ authUserId: authB, familyId: familyB, boundAt: TIME });
      await queue.enqueueCurrentBinding(syncEntityReferences.explorer(explorerId));
      expect(
        (await outbox.countPending(familyA)) === 4,
        'Family A operations changed after detach',
      );
      expect((await outbox.countPending(familyB)) === 1, 'Family B operation missing');
      const operation = (await outbox.listPending(familyB, 1))[0];
      await outbox.recordAttemptFailure(operation.operationId, 'offline', TIME);
      const failedOperation = (await outbox.listPending(familyB, 1))[0];
      expect(
        failedOperation.attemptCount === 1 && failedOperation.lastErrorCode === 'offline',
        'failure metadata was not recorded',
      );
      await db.closeAsync();

      const reopened = await openDatabaseAsync(DATABASE_NAME);
      await initializeDatabase(reopened);
      const reopenedOutbox = new SQLiteSyncOutboxRepository(() => Promise.resolve(reopened));
      expect(
        (await reopenedOutbox.countPending(familyA)) === 4,
        'Family A queue did not survive restart',
      );
      expect(
        (await reopenedOutbox.countPending(familyB)) === 1,
        'Family B queue did not survive restart',
      );
      await reopenedOutbox.removeDelivered(operation.operationId);
      expect((await reopenedOutbox.countPending(familyB)) === 0, 'delivered operation remained');
      await reopened.closeAsync();
    },
  );

  return results;
}

export function Phase9SyncQueueValidationScreen() {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    void runValidation().then(setResults);
  }, []);

  return (
    <ScrollView className="flex-1 bg-cream p-6">
      <Text className="mb-4 text-2xl font-bold text-ink">Phase 9D SQLite queue validation</Text>
      {results?.map((result) => (
        <View key={result.name} className="mb-3 rounded-xl bg-white p-4">
          <Text className="font-semibold text-ink">
            {result.error ? 'FAIL' : 'PASS'} — {result.name}
          </Text>
          {result.error ? <Text className="mt-1 text-red-700">{result.error}</Text> : null}
        </View>
      ))}
      {!results ? <Text className="text-ink">Running native SQLite checks…</Text> : null}
    </ScrollView>
  );
}
