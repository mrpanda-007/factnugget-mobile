import { readContentCacheRow, writeContentCacheRow } from '@database/contentCacheQueries';

import {
  CONTENT_SNAPSHOT_SCHEMA_VERSION,
  validateContentSnapshot,
  type ContentSnapshot,
} from './contentSnapshot';

/**
 * Reads the last-known-good snapshot, or null if there is none, it fails to
 * parse, it is a schema version this build does not understand, or it fails
 * validation. Every failure mode degrades to null rather than throwing — a
 * corrupt cache must fall through to the bundled starter, never crash
 * (Phase 11C.2 §75/§76).
 */
export async function readCachedSnapshot(): Promise<ContentSnapshot | null> {
  const row = await readContentCacheRow();
  if (!row) return null;
  if (row.snapshot_schema_version !== CONTENT_SNAPSHOT_SCHEMA_VERSION) return null;

  let snapshot: ContentSnapshot;
  try {
    snapshot = JSON.parse(row.snapshot_json) as ContentSnapshot;
  } catch {
    return null;
  }

  if (!snapshot || typeof snapshot !== 'object') return null;
  if (validateContentSnapshot(snapshot).valid !== true) return null;
  return snapshot;
}

/**
 * Persists a snapshot atomically (database/contentCacheQueries.ts is a single
 * UPSERT statement). The caller is expected to have already validated the
 * snapshot — this is a defensive second check, not the primary gate, so a
 * caching bug can never make an already-rejected snapshot durable.
 */
export async function writeCachedSnapshot(snapshot: ContentSnapshot): Promise<void> {
  if (validateContentSnapshot(snapshot).valid !== true) {
    throw new Error('Refusing to cache an invalid content snapshot.');
  }
  await writeContentCacheRow({
    snapshot_schema_version: snapshot.schemaVersion,
    dataset: snapshot.dataset,
    fetched_at: snapshot.fetchedAt,
    snapshot_json: JSON.stringify(snapshot),
  });
}
