import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { openDatabaseAsync } from 'expo-sqlite';

import { getDatabase } from '../database/client';
import { readContentCacheRow, writeContentCacheRow } from '../database/contentCacheQueries';
import {
  createTemporarySQLiteDatabase,
  type TemporarySQLiteDatabase,
} from './helpers/NodeSQLiteDatabase';

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));

/**
 * Exercises the real v5 migration end to end — not just the query functions —
 * by letting the actual getDatabase()/initializeDatabase() path run against a
 * temporary on-disk SQLite file, exactly as Phase 7's own validation harness
 * does for the earlier schema versions.
 */
describe('content_cache table (schema v5)', () => {
  let temp: TemporarySQLiteDatabase;

  beforeAll(async () => {
    temp = await createTemporarySQLiteDatabase();
    vi.mocked(openDatabaseAsync).mockResolvedValue(temp.database.asExpoDatabase());
    await getDatabase(); // triggers initializeDatabase(), migrating through v5
  });

  afterAll(async () => {
    await temp.cleanup();
  });

  it('starts empty', async () => {
    expect(await readContentCacheRow()).toBeNull();
  });

  it('round-trips a written row', async () => {
    await writeContentCacheRow({
      snapshot_schema_version: 1,
      dataset: 'development',
      fetched_at: '2026-08-19T00:00:00.000Z',
      snapshot_json: '{"worlds":[]}',
    });

    expect(await readContentCacheRow()).toEqual({
      snapshot_schema_version: 1,
      dataset: 'development',
      fetched_at: '2026-08-19T00:00:00.000Z',
      snapshot_json: '{"worlds":[]}',
    });
  });

  it('a second write atomically replaces the first (singleton row, never a duplicate)', async () => {
    await writeContentCacheRow({
      snapshot_schema_version: 1,
      dataset: 'production',
      fetched_at: '2026-08-19T01:00:00.000Z',
      snapshot_json: '{"worlds":[{"id":"ocean"}]}',
    });

    const row = await readContentCacheRow();
    expect(row?.dataset).toBe('production');
    expect(row?.fetched_at).toBe('2026-08-19T01:00:00.000Z');

    const db = await getDatabase();
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM content_cache;');
    expect(count?.n).toBe(1);
  });
});
