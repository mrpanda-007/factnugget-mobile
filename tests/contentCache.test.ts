import { describe, expect, it, vi, beforeEach } from 'vitest';

import { readCachedSnapshot, writeCachedSnapshot } from '../application/content/contentCache';
import {
  CONTENT_SNAPSHOT_SCHEMA_VERSION,
  type ContentSnapshot,
} from '../application/content/contentSnapshot';
import { parseDiscoveryId, parseLearningPackId, parseWorldId } from '../types/domain/ids';

const store: {
  row: {
    snapshot_schema_version: number;
    dataset: string;
    fetched_at: string;
    snapshot_json: string;
  } | null;
} = {
  row: null,
};

vi.mock('../database/contentCacheQueries', () => ({
  readContentCacheRow: vi.fn(async () => store.row),
  writeContentCacheRow: vi.fn(async (row) => {
    store.row = row;
  }),
}));

const worldId = parseWorldId('ocean');
const packId = parseLearningPackId('ocean-secrets');
const discoveryId = parseDiscoveryId('octopus');

function validSnapshot(): ContentSnapshot {
  return {
    schemaVersion: CONTENT_SNAPSHOT_SCHEMA_VERSION,
    dataset: 'development',
    fetchedAt: '2026-08-19T00:00:00.000Z',
    source: 'sanity',
    worlds: [
      {
        id: worldId,
        slug: 'ocean-world' as never,
        title: 'Ocean World',
        tagline: 'Dive in',
        themeKey: 'ocean',
        badge: { title: 'Badge', icon: '🏆', accessibleDescription: 'Badge' },
        sortOrder: 10,
        lifecycle: 'published',
        revision: 'a',
      },
    ],
    learningPacks: [
      {
        id: packId,
        slug: 'ocean-secrets' as never,
        worldId,
        title: 'Ocean Secrets',
        subtitle: 's',
        sortOrder: 10,
        accessType: 'free',
        completionRole: 'required',
        lifecycle: 'published',
        revision: 'b',
      },
    ],
    discoveries: [
      {
        id: discoveryId,
        slug: 'octopus' as never,
        title: 'Octopus',
        subtitle: 's',
        headlineFact: 'f',
        explanation: 'e',
        deeperExplanation: 'd',
        advancedExplanation: 'a',
        images: [],
        fallbackEmoji: '🐙',
        estimatedReadingSeconds: 30,
        lifecycle: 'published',
        revision: 'c',
      },
    ],
    packMemberships: [
      { learningPackId: packId, discoveryId, position: 1, completionRole: 'required' },
    ],
  };
}

beforeEach(() => {
  store.row = null;
});

describe('content cache: read/write round trip', () => {
  it('returns null when nothing has been cached', async () => {
    expect(await readCachedSnapshot()).toBeNull();
  });

  it('round-trips a valid snapshot', async () => {
    await writeCachedSnapshot(validSnapshot());
    expect(await readCachedSnapshot()).toEqual(validSnapshot());
  });

  it('refuses to write a snapshot that fails validation', async () => {
    const invalid = { ...validSnapshot(), worlds: [] };
    await expect(writeCachedSnapshot(invalid)).rejects.toThrow();
    expect(store.row).toBeNull();
  });
});

describe('content cache: corruption degrades to null, never throws', () => {
  it('rejects unparsable JSON', async () => {
    store.row = {
      snapshot_schema_version: CONTENT_SNAPSHOT_SCHEMA_VERSION,
      dataset: 'development',
      fetched_at: '2026-08-19T00:00:00.000Z',
      snapshot_json: '{not valid json',
    };
    expect(await readCachedSnapshot()).toBeNull();
  });

  it('rejects an unknown snapshot schema version rather than parsing optimistically', async () => {
    store.row = {
      snapshot_schema_version: 999,
      dataset: 'development',
      fetched_at: '2026-08-19T00:00:00.000Z',
      snapshot_json: JSON.stringify(validSnapshot()),
    };
    expect(await readCachedSnapshot()).toBeNull();
  });

  it('rejects a structurally valid-JSON cache that fails content validation', async () => {
    const corrupt = { ...validSnapshot(), learningPacks: [] };
    store.row = {
      snapshot_schema_version: CONTENT_SNAPSHOT_SCHEMA_VERSION,
      dataset: 'development',
      fetched_at: '2026-08-19T00:00:00.000Z',
      snapshot_json: JSON.stringify(corrupt),
    };
    expect(await readCachedSnapshot()).toBeNull();
  });
});
