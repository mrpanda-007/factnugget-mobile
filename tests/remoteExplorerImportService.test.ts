import { describe, expect, it, vi } from 'vitest';

import { RemoteExplorerImportService } from '../application/sync/RemoteExplorerImportService';
import {
  parseAuthUserId,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
} from '../types/domain/ids';

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));

const timestamp = '2026-08-18T00:00:00.000Z';
const familyId = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const userId = parseAuthUserId('parent-a');
const explorerId = parseExplorerId('00000000-0000-4000-8000-000000000001');

function service(options: { malformed?: boolean; existing?: boolean } = {}) {
  const applied: string[] = [];
  const local = {
    getExplorer: async () =>
      options.existing ? { id: explorerId, lookId: 'animal' as const, createdAt: timestamp } : null,
    withTransaction: async <T>(work: () => Promise<T>) => work(),
    applyExplorer: async () => {
      applied.push('explorer');
      return !options.existing;
    },
    applyDiscovery: async () => {
      applied.push('discovery');
    },
    applyPackDiscovery: async () => {
      applied.push('packDiscovery');
    },
    applyLearningPack: async () => {
      applied.push('learningPack');
    },
    applyBadge: async () => {
      applied.push('badge');
    },
    setActiveExplorer: async () => undefined,
  };
  const explorer = {
    explorerId,
    lookId: 'animal' as const,
    createdAt: timestamp,
    schemaVersion: 1,
  };
  const value = new RemoteExplorerImportService({
    bindings: {
      getCurrentBinding: async () => ({
        state: 'bound' as const,
        authUserId: userId,
        familyId,
        boundAt: timestamp,
        updatedAt: timestamp,
      }),
      bind: async () => {
        throw new Error('not used');
      },
      replaceBinding: async () => {
        throw new Error('not used');
      },
      detach: async () => undefined,
    },
    session: {
      getSession: async () => ({
        authUserId: userId,
        email: null,
        emailVerified: true,
        createdAt: timestamp,
      }),
    },
    cloud: {
      getFamily: async () => null,
      getFamilyMembership: async () => ({
        familyId,
        authUserId: userId,
        role: 'parent' as const,
        createdAt: timestamp,
        schemaVersion: 1,
      }),
      listFamilyExplorers: async () => [explorer],
      pullExplorerState: async () => ({
        explorer,
        discoveryProgress: [
          {
            explorerId,
            discoveryId: parseDiscoveryId('blue-whale'),
            revealedAt: options.malformed ? 'not-a-time' : timestamp,
            collectedAt: null,
            schemaVersion: 1,
          },
        ],
        packDiscoveryProgress: [],
        learningPackProgress: [],
        earnedBadges: [],
      }),
      upsertExplorer: async () => ({ state: 'success' as const }),
      upsertDiscoveryProgress: async () => ({ state: 'success' as const }),
      upsertPackDiscoveryProgress: async () => ({ state: 'success' as const }),
      upsertLearningPackProgress: async () => ({ state: 'success' as const }),
      upsertBadge: async () => ({ state: 'success' as const }),
    },
    localState: local as never,
  });
  return { value, applied };
}

describe('Phase 9G remote Explorer import', () => {
  it('lists current-family summaries and imports a validated cloud-only Explorer without an outbox echo', async () => {
    const runtime = service();
    expect(await runtime.value.listAvailable()).toEqual([
      { explorerId, lookId: 'animal', createdAt: timestamp },
    ]);
    expect(await runtime.value.importExplorer(explorerId)).toEqual({
      state: 'success',
      explorerId,
      mergedExisting: false,
    });
    expect(runtime.applied).toEqual(['explorer', 'discovery']);
  });

  it('merges an existing same UUID and rejects malformed remote state before any local write', async () => {
    const existing = service({ existing: true });
    expect(await existing.value.importExplorer(explorerId)).toMatchObject({
      state: 'success',
      mergedExisting: true,
    });
    const malformed = service({ malformed: true });
    expect(await malformed.value.importExplorer(explorerId)).toEqual({
      state: 'failure',
      error: 'invalidRemoteData',
    });
    expect(malformed.applied).toEqual([]);
  });
});
