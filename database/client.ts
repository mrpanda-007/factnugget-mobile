import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrations } from '@database/schema';

const DATABASE_NAME = 'factnuggets.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.execAsync(migration.statements.join('\n'));
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
}

async function createDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await runMigrations(db);
  return db;
}

/** Singleton connection. Every database/ query module calls this — never openDatabaseAsync directly. */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }
  return databasePromise;
}
