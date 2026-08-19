import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type StatementResultingChanges } from 'node:sqlite';

import type { SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

type BindValue = string | number | null | Uint8Array;

function normalizeResult(result: StatementResultingChanges): SQLiteRunResult {
  return {
    changes: Number(result.changes),
    lastInsertRowId: Number(result.lastInsertRowid),
  };
}

/**
 * Minimal Expo SQLite-compatible bridge used only by Node integration tests.
 * Production repositories receive this through their existing database factory.
 */
export class NodeSQLiteDatabase {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
  }

  async execAsync(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async runAsync(sql: string, ...params: BindValue[]): Promise<SQLiteRunResult> {
    return normalizeResult(this.database.prepare(sql).run(...params));
  }

  async getFirstAsync<T>(sql: string, ...params: BindValue[]): Promise<T | null> {
    return (this.database.prepare(sql).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: BindValue[]): Promise<T[]> {
    return this.database.prepare(sql).all(...params) as T[];
  }

  async withTransactionAsync(work: () => Promise<void>): Promise<void> {
    this.database.exec('BEGIN IMMEDIATE;');
    try {
      await work();
      this.database.exec('COMMIT;');
    } catch (error) {
      this.database.exec('ROLLBACK;');
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }

  asExpoDatabase(): SQLiteDatabase {
    return this as unknown as SQLiteDatabase;
  }
}

export interface TemporarySQLiteDatabase {
  database: NodeSQLiteDatabase;
  path: string;
  reopen(): NodeSQLiteDatabase;
  cleanup(): Promise<void>;
}

export async function createTemporarySQLiteDatabase(): Promise<TemporarySQLiteDatabase> {
  const directory = await mkdtemp(join(tmpdir(), 'factnuggets-phase11b-'));
  const path = join(directory, 'factnuggets.db');
  let database = new NodeSQLiteDatabase(path);
  return {
    get database() {
      return database;
    },
    path,
    reopen() {
      database.close();
      database = new NodeSQLiteDatabase(path);
      return database;
    },
    async cleanup() {
      database.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
