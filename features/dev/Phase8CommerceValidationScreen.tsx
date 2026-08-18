import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase } from '@database/client';
import { migrations, V2_SCHEMA_STATEMENTS } from '@database/schema';
import { SQLiteEntitlementRepository } from '@repositories/adapters/SQLiteEntitlementRepository';
import type { Entitlement } from '@app-types/domain/commerce';
import type { LearningPack } from '@app-types/domain/content';
import {
  createEntitlementId,
  createExplorerId,
  parseCommerceKey,
  parseContentSlug,
  parseLearningPackId,
  parseWorldId,
} from '@app-types/domain/ids';

const DATABASE_NAME = 'factnuggets-phase8-commerce-validation.db';
const FIXED_TIME = '2026-08-17T00:00:00.000Z';

interface Result {
  name: string;
  error?: string;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const oceanPack: LearningPack = {
  id: parseLearningPackId('ocean-secrets'),
  slug: parseContentSlug('ocean-secrets'),
  worldId: parseWorldId('ocean'),
  title: 'Ocean Secrets',
  subtitle: '',
  sortOrder: 1,
  accessType: 'free',
  completionRole: 'required',
  lifecycle: 'published',
  revision: '1',
};

const spacePack: LearningPack = {
  id: parseLearningPackId('space-adventures'),
  slug: parseContentSlug('space-adventures'),
  worldId: parseWorldId('space'),
  title: 'Space Adventures',
  subtitle: '',
  sortOrder: 1,
  accessType: 'paid',
  commerceKey: parseCommerceKey('space-adventures-one-time'),
  completionRole: 'required',
  lifecycle: 'published',
  revision: '1',
};

function makeEntitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: createEntitlementId(),
    subject: { type: 'learningPack', id: spacePack.id },
    source: 'apple',
    status: 'active',
    grantedAt: FIXED_TIME,
    expiresAt: null,
    lastVerifiedAt: FIXED_TIME,
    sourceReferenceHash: null,
    updatedAt: FIXED_TIME,
    ...overrides,
  };
}

async function resetDatabase(): Promise<SQLiteDatabase> {
  try {
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch (error) {
    if (!String(error).includes('not found')) throw error;
  }
  return openDatabaseAsync(DATABASE_NAME);
}

/** A real, populated Phase 7 V2 database used only by this isolated harness. */
async function seedV2(db: SQLiteDatabase): Promise<{ explorerA: string; explorerB: string }> {
  await db.execAsync(migrations[0].statements.join('\n'));
  await db.execAsync(V2_SCHEMA_STATEMENTS.join('\n'));
  const explorerA = createExplorerId();
  const explorerB = createExplorerId();
  await db.runAsync(
    'INSERT INTO local_explorers (id, look_id, created_at, updated_at) VALUES (?, ?, ?, ?), (?, ?, ?, ?);',
    explorerA,
    'ocean',
    FIXED_TIME,
    FIXED_TIME,
    explorerB,
    'space',
    FIXED_TIME,
    FIXED_TIME,
  );
  await db.runAsync(
    'INSERT INTO device_settings (id, active_explorer_id, sound_enabled, updated_at) VALUES (1, ?, 1, ?);',
    explorerA,
    FIXED_TIME,
  );
  await db.runAsync(
    `INSERT INTO discovery_progress (explorer_id, discovery_id, revealed_at, collected_at, updated_at)
     VALUES (?, 'octopus', ?, ?, ?);`,
    explorerA,
    FIXED_TIME,
    FIXED_TIME,
    FIXED_TIME,
  );
  await db.runAsync(
    `INSERT INTO learning_pack_progress
       (explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision, updated_at)
     VALUES (?, 'ocean-secrets', ?, ?, ?, '1', ?);`,
    explorerA,
    FIXED_TIME,
    FIXED_TIME,
    FIXED_TIME,
    FIXED_TIME,
  );
  await db.runAsync(
    `INSERT INTO earned_badges (explorer_id, world_id, earned_at, content_revision)
     VALUES (?, 'ocean', ?, '1');`,
    explorerA,
    FIXED_TIME,
  );
  await db.execAsync('PRAGMA user_version = 2;');
  return { explorerA, explorerB };
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

  await scenario('Fresh V4, free access, and paid locked access', async () => {
    const db = await resetDatabase();
    await initializeDatabase(db);
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        4,
      'fresh database is not V4',
    );
    const repository = new SQLiteEntitlementRepository({ database: () => Promise.resolve(db) });
    expect(
      (await repository.getLearningPackAccess(oceanPack)).state === 'accessible',
      'free Pack locked',
    );
    expect(
      (await repository.getLearningPackAccess(spacePack)).state === 'locked',
      'paid Pack unlocked',
    );
    expect(
      (await repository.listEntitlements()).length === 0,
      'fresh database created an entitlement',
    );
    await db.closeAsync();
  });

  await scenario('V2 to V4 preserves Phase 7 records without entitlements', async () => {
    const db = await resetDatabase();
    const { explorerA } = await seedV2(db);
    await initializeDatabase(db);
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        4,
      'V2 database did not migrate to V4',
    );
    expect(
      (
        await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM local_explorers WHERE id = ?;',
          explorerA,
        )
      )?.id === explorerA,
      'Explorer changed during migration',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM discovery_progress;')).length === 1,
      'progress changed',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM learning_pack_progress;')).length === 1,
      'Pack progress changed',
    );
    expect((await db.getAllAsync('SELECT * FROM earned_badges;')).length === 1, 'Badge changed');
    expect(
      (await db.getAllAsync('SELECT * FROM local_entitlements;')).length === 0,
      'entitlement invented',
    );
    await db.closeAsync();
  });

  await scenario('V3 rollback preserves V2 and retry succeeds', async () => {
    const db = await resetDatabase();
    await seedV2(db);
    try {
      await initializeDatabase(db, {
        beforeVersionThreeCommit: () => {
          throw new Error('controlled V3 rollback');
        },
      });
    } catch {
      /* expected */
    }
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        2,
      'rollback advanced version',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM learning_pack_progress;')).length === 1,
      'rollback lost progress',
    );
    await initializeDatabase(db);
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        4,
      'retry did not migrate',
    );
    await db.closeAsync();
  });

  await scenario('Entitlement persists across restart and is shared by Explorers', async () => {
    const db = await resetDatabase();
    const { explorerA, explorerB } = await seedV2(db);
    await initializeDatabase(db);
    const repository = new SQLiteEntitlementRepository({ database: () => Promise.resolve(db) });
    await repository.upsertEntitlement(makeEntitlement());
    expect(
      (await repository.getLearningPackAccess(spacePack)).state === 'accessible',
      'active grant locked',
    );
    expect(explorerA !== explorerB, 'Explorer fixture is not isolated');
    await db.closeAsync();
    const reopened = await openDatabaseAsync(DATABASE_NAME);
    await initializeDatabase(reopened);
    const restarted = new SQLiteEntitlementRepository({
      database: () => Promise.resolve(reopened),
    });
    expect(
      (await restarted.getLearningPackAccess(spacePack)).state === 'accessible',
      'restart lost grant',
    );
    expect(
      (
        await reopened.getAllAsync(
          'SELECT * FROM learning_pack_progress WHERE explorer_id = ?;',
          explorerB,
        )
      ).length === 0,
      'entitlement created Explorer progress',
    );
    await reopened.closeAsync();
  });

  await scenario('Revoked and expired entitlements lock without deleting progress', async () => {
    const db = await resetDatabase();
    await seedV2(db);
    await initializeDatabase(db);
    const repository = new SQLiteEntitlementRepository({
      database: () => Promise.resolve(db),
      now: () => FIXED_TIME,
    });
    await repository.upsertEntitlement(makeEntitlement({ status: 'revoked' }));
    expect(
      (await repository.getLearningPackAccess(spacePack)).state === 'locked',
      'revoked grant allowed',
    );
    await repository.upsertEntitlement(
      makeEntitlement({ status: 'active', expiresAt: '2026-08-16T00:00:00.000Z' }),
    );
    expect(
      (await repository.getLearningPackAccess(spacePack)).state === 'locked',
      'expired grant allowed',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM discovery_progress;')).length === 1,
      'access change deleted progress',
    );
    await db.closeAsync();
  });

  await scenario('Production ignores persisted development grants', async () => {
    const db = await resetDatabase();
    await initializeDatabase(db);
    const development = new SQLiteEntitlementRepository({
      database: () => Promise.resolve(db),
      allowedSources: ['apple', 'google', 'development'],
    });
    await development.upsertEntitlement(makeEntitlement({ source: 'development' }));
    expect(
      (await development.getLearningPackAccess(spacePack)).state === 'accessible',
      'development grant failed',
    );
    const production = new SQLiteEntitlementRepository({
      database: () => Promise.resolve(db),
      allowedSources: ['apple', 'google'],
    });
    expect(
      (await production.getLearningPackAccess(spacePack)).state === 'locked',
      'production honored development grant',
    );
    await db.closeAsync();
  });

  return results;
}

export function Phase8CommerceValidationScreen() {
  const [results, setResults] = useState<Result[] | null>(null);
  useEffect(() => {
    void runValidation().then(setResults);
  }, []);
  const passed = results?.filter((result) => !result.error).length ?? 0;
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 16, backgroundColor: '#FFF9EC' }}>
      <Text style={{ fontSize: 26, fontWeight: '700' }}>Phase 8 commerce SQLite validation</Text>
      <Text>
        {results
          ? `${passed}/${results.length} scenarios passed`
          : 'Running isolated native SQLite…'}
      </Text>
      {results?.map((result) => (
        <View key={result.name}>
          <Text style={{ color: result.error ? '#B42318' : '#137333' }}>
            {result.error ? `✗ ${result.name}: ${result.error}` : `✓ ${result.name}`}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
