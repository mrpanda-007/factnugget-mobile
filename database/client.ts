import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { V2_SCHEMA_STATEMENTS, migrations } from '@database/schema';
import { createExplorerId } from '@app-types/domain/ids';
import { getLegacyWorldForPack } from '@database/legacyContentMappings';

const DATABASE_NAME = 'factnuggets.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

const FALLBACK_LOOK_ID = 'animal';

interface LegacyIdentityRow {
  identity_id: string;
  chosen_at: string;
}

interface LegacySettingsRow {
  sound_enabled: number;
}

interface LegacyDiscoveryRow {
  discovery_id: string;
  deck_id: string;
  completed_at: string;
}

interface LegacyDeckRow {
  deck_id: string;
  started_at: string;
  last_viewed_at: string;
  completed_at: string | null;
}

async function migrateV2(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(V2_SCHEMA_STATEMENTS.join('\n'));
  const [identity, settings, discoveries, decks] = await Promise.all([
    db.getFirstAsync<LegacyIdentityRow>(
      'SELECT identity_id, chosen_at FROM explorer_identity WHERE id = 1;',
    ),
    db.getFirstAsync<LegacySettingsRow>('SELECT sound_enabled FROM settings WHERE id = 1;'),
    db.getAllAsync<LegacyDiscoveryRow>(
      'SELECT discovery_id, deck_id, completed_at FROM legacy_discovery_progress;',
    ),
    db.getAllAsync<LegacyDeckRow>(
      'SELECT deck_id, started_at, last_viewed_at, completed_at FROM deck_progress;',
    ),
  ]);
  const needsExplorer = Boolean(identity || discoveries.length || decks.length);
  const migratedAt = new Date().toISOString();
  const explorerId = needsExplorer ? createExplorerId() : null;

  if (explorerId) {
    await db.runAsync(
      'INSERT INTO local_explorers (id, look_id, created_at, updated_at) VALUES (?, ?, ?, ?);',
      explorerId,
      identity?.identity_id ?? FALLBACK_LOOK_ID,
      identity?.chosen_at ?? migratedAt,
      migratedAt,
    );
  }
  await db.runAsync(
    'INSERT INTO device_settings (id, active_explorer_id, sound_enabled, updated_at) VALUES (1, ?, ?, ?);',
    explorerId,
    settings?.sound_enabled ?? 0,
    migratedAt,
  );
  if (!explorerId) return;

  for (const row of discoveries) {
    await db.runAsync(
      `INSERT INTO discovery_progress (explorer_id, discovery_id, revealed_at, collected_at, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      explorerId,
      row.discovery_id,
      row.completed_at,
      row.completed_at,
      row.completed_at,
    );
    await db.runAsync(
      `INSERT INTO pack_discovery_progress
       (explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      explorerId,
      row.deck_id,
      row.discovery_id,
      row.completed_at,
      row.completed_at,
      row.completed_at,
    );
  }
  for (const row of decks) {
    await db.runAsync(
      `INSERT INTO learning_pack_progress
       (explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?);`,
      explorerId,
      row.deck_id,
      row.started_at,
      row.last_viewed_at,
      row.completed_at,
      row.completed_at ?? row.last_viewed_at,
    );
    const world = row.completed_at ? getLegacyWorldForPack(row.deck_id) : null;
    if (world?.isOnlyRequiredPack) {
      await db.runAsync(
        'INSERT INTO earned_badges (explorer_id, world_id, earned_at, content_revision) VALUES (?, ?, ?, NULL);',
        explorerId,
        world.worldId,
        row.completed_at,
      );
    }
  }
}

export interface DatabaseInitializationOptions {
  /** Development-harness hook used to prove transaction rollback. */
  beforeVersionTwoCommit?: () => Promise<void> | void;
  /** Development-harness hook used to prove V3 entitlement migration rollback. */
  beforeVersionThreeCommit?: () => Promise<void> | void;
  /** Development-harness hook used to prove V4 account-binding/outbox migration rollback. */
  beforeVersionFourCommit?: () => Promise<void> | void;
}

export async function initializeDatabase(
  db: SQLiteDatabase,
  options: DatabaseInitializationOptions = {},
): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion > 4)
    throw new Error(`Database version ${currentVersion} is newer than this app supports.`);

  await db.withTransactionAsync(async () => {
    const pendingBeforeV2 = migrations
      .filter((migration) => migration.version > currentVersion && migration.version < 2)
      .sort((a, b) => a.version - b.version);
    for (const migration of pendingBeforeV2) {
      await db.execAsync(migration.statements.join('\n'));
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    }
    if (currentVersion < 2) {
      await migrateV2(db);
      await options.beforeVersionTwoCommit?.();
      await db.execAsync('PRAGMA user_version = 2;');
    }
    const pendingAfterV2 = migrations
      .filter((migration) => migration.version > Math.max(currentVersion, 2))
      .sort((a, b) => a.version - b.version);
    for (const migration of pendingAfterV2) {
      await db.execAsync(migration.statements.join('\n'));
      if (migration.version === 3) await options.beforeVersionThreeCommit?.();
      if (migration.version === 4) await options.beforeVersionFourCommit?.();
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    }
  });
}

async function createDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
}

/** Singleton connection. Every database/ query module calls this — never openDatabaseAsync directly. */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }
  return databasePromise;
}

/** Keeps one logical progress action atomic on the singleton SQLite connection. */
export async function withDatabaseTransaction<T>(work: () => Promise<T>): Promise<T> {
  const db = await getDatabase();
  let value: T | undefined;
  await db.withTransactionAsync(async () => {
    value = await work();
  });
  return value as T;
}
