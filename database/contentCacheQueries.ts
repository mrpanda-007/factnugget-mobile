import { getDatabase } from '@database/client';

interface ContentCacheRow {
  snapshot_schema_version: number;
  dataset: string;
  fetched_at: string;
  snapshot_json: string;
}

export async function readContentCacheRow(): Promise<ContentCacheRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ContentCacheRow>(
    'SELECT snapshot_schema_version, dataset, fetched_at, snapshot_json FROM content_cache WHERE singleton_id = 1;',
  );
  return row ?? null;
}

/**
 * Single-statement UPSERT on a singleton row: the write is one atomic SQLite
 * statement, so a crash mid-write can never leave a half-updated cache — the
 * previous row is either fully replaced or untouched (Phase 11C.2 §36/§74).
 */
export async function writeContentCacheRow(row: ContentCacheRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO content_cache (singleton_id, snapshot_schema_version, dataset, fetched_at, snapshot_json)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT (singleton_id) DO UPDATE SET
       snapshot_schema_version = excluded.snapshot_schema_version,
       dataset = excluded.dataset,
       fetched_at = excluded.fetched_at,
       snapshot_json = excluded.snapshot_json;`,
    row.snapshot_schema_version,
    row.dataset,
    row.fetched_at,
    row.snapshot_json,
  );
}
