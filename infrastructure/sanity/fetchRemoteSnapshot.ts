import type { SanityClient } from '@sanity/client';

import { contentError, type ContentError } from '../../application/content/contentErrors';
import {
  validateContentSnapshot,
  type ContentSnapshot,
} from '../../application/content/contentSnapshot';

import { CONTENT_SNAPSHOT_QUERY } from './queries';
import { mapContentSnapshot, type RawContentSnapshot } from './mappers';

export type FetchSnapshotResult =
  { ok: true; snapshot: ContentSnapshot } | { ok: false; error: ContentError };

/**
 * Fetch → map → validate, as one operation with one outcome. Network failure
 * and malformed content are reported as distinct ContentError codes so the
 * caller (contentRuntime) can decide separately whether to retry — but either
 * way, nothing here ever returns a partially-built or unvalidated snapshot
 * (Phase 11C.2 §35/§36).
 */
export async function fetchRemoteSnapshot(
  client: SanityClient,
  dataset: string,
): Promise<FetchSnapshotResult> {
  let raw: RawContentSnapshot;
  try {
    raw = await client.fetch<RawContentSnapshot>(CONTENT_SNAPSHOT_QUERY);
  } catch (cause) {
    return {
      ok: false,
      error: contentError(
        'networkUnavailable',
        cause instanceof Error ? cause.message : String(cause),
      ),
    };
  }

  let snapshot: ContentSnapshot;
  try {
    snapshot = mapContentSnapshot(client, raw, { dataset, fetchedAt: new Date().toISOString() });
  } catch (cause) {
    return {
      ok: false,
      error: contentError(
        'invalidRemoteSnapshot',
        cause instanceof Error ? cause.message : String(cause),
      ),
    };
  }

  const validation = validateContentSnapshot(snapshot);
  if (!validation.valid) {
    return {
      ok: false,
      error: contentError('invalidRemoteSnapshot', validation.errors.join('; ')),
    };
  }

  return { ok: true, snapshot };
}
