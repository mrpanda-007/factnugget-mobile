import { describe, expect, it } from 'vitest';

import {
  CONTENT_SNAPSHOT_SCHEMA_VERSION,
  validateContentSnapshot,
  type ContentSnapshot,
} from '../application/content/contentSnapshot';
import { parseDiscoveryId, parseLearningPackId, parseWorldId } from '../types/domain/ids';

const worldId = parseWorldId('ocean');
const packId = parseLearningPackId('ocean-secrets');
const discoveryId = parseDiscoveryId('octopus');

function validSnapshot(overrides: Partial<ContentSnapshot> = {}): ContentSnapshot {
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
        badge: {
          title: 'Ocean Explorer Badge',
          icon: '🏆',
          accessibleDescription: 'Ocean Explorer Badge',
        },
        sortOrder: 10,
        lifecycle: 'published',
        revision: 'abc',
      },
    ],
    learningPacks: [
      {
        id: packId,
        slug: 'ocean-secrets' as never,
        worldId,
        title: 'Ocean Secrets',
        subtitle: '4 discoveries',
        sortOrder: 10,
        accessType: 'free',
        completionRole: 'required',
        lifecycle: 'published',
        revision: 'def',
      },
    ],
    discoveries: [
      {
        id: discoveryId,
        slug: 'octopus' as never,
        title: 'Octopus',
        subtitle: 'Eight arms',
        headlineFact: 'Three hearts!',
        explanation: 'Two pump blue blood.',
        deeperExplanation: 'Deeper.',
        advancedExplanation: 'Advanced.',
        images: [],
        fallbackEmoji: '🐙',
        estimatedReadingSeconds: 30,
        lifecycle: 'published',
        revision: 'ghi',
      },
    ],
    packMemberships: [
      { learningPackId: packId, discoveryId, position: 1, completionRole: 'required' },
    ],
    ...overrides,
  };
}

describe('validateContentSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    expect(validateContentSnapshot(validSnapshot())).toEqual({ valid: true });
  });

  it('rejects an unknown schema version outright', () => {
    const result = validateContentSnapshot(validSnapshot({ schemaVersion: 999 }));
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate World ids', () => {
    const snapshot = validSnapshot();
    snapshot.worlds.push({ ...snapshot.worlds[0] });
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some((error) => error.includes('Duplicate World'))).toBe(true);
  });

  it('rejects a Learning Pack that references a missing World', () => {
    const snapshot = validSnapshot({ worlds: [] });
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some((error) => error.includes('missing World'))).toBe(true);
  });

  it('rejects a membership that references a missing Discovery', () => {
    const snapshot = validSnapshot({ discoveries: [] });
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes('missing Discovery'))).toBe(true);
    }
  });

  it('rejects a Discovery appearing twice in the same Pack', () => {
    const snapshot = validSnapshot();
    snapshot.packMemberships.push({ ...snapshot.packMemberships[0] });
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some((error) => error.includes('more than once'))).toBe(true);
  });

  it('rejects a Learning Pack with zero memberships', () => {
    const snapshot = validSnapshot({ packMemberships: [] });
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes('no Discovery memberships'))).toBe(true);
    }
  });

  it('rejects an empty World title', () => {
    const snapshot = validSnapshot();
    snapshot.worlds[0].title = '   ';
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
  });

  it('a malformed snapshot never partially validates — every problem is reported, not just the first', () => {
    const snapshot = validSnapshot({ worlds: [], discoveries: [] });
    const result = validateContentSnapshot(snapshot);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThan(1);
  });
});
