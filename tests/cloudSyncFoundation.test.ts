import { describe, expect, it } from 'vitest';

import {
  badgePath,
  discoveryProgressPath,
  packDiscoveryDocumentId,
  packDiscoveryProgressPath,
} from '../application/sync/cloudPaths';
import {
  parseCloudDiscoveryProgressDto,
  parseCloudLearningPackProgressDto,
  parseCloudPackDiscoveryProgressDto,
  toCloudDiscoveryProgressDto,
  toCloudEarnedBadgeDto,
  parseCloudEarnedBadgeDto,
} from '../application/sync/cloudDtoMappers';
import {
  mergeDiscoveryProgress,
  mergeEarnedBadge,
  mergeLearningPackProgress,
  mergePackDiscoveryProgress,
} from '../application/sync/merge/progressMerge';
import type { SyncEntityType } from '../types/domain/cloud';
import {
  createExplorerId,
  createFamilyId,
  parseDiscoveryId,
  parseLearningPackId,
  parseWorldId,
} from '../types/domain/ids';

const explorerId = createExplorerId();
const familyId = createFamilyId();
const discoveryId = parseDiscoveryId('blue-whale');
const learningPackId = parseLearningPackId('ocean-basics');
const worldId = parseWorldId('ocean');
const early = '2026-01-01T00:00:00.000Z';
const middle = '2026-01-02T00:00:00.000Z';
const late = '2026-01-03T00:00:00.000Z';

describe('Phase 9 cloud sync foundation', () => {
  it('limits sync contracts to educational state, never Store entitlement authority', () => {
    const syncable: SyncEntityType[] = [
      'explorer',
      'discoveryProgress',
      'packDiscoveryProgress',
      'learningPackProgress',
      'earnedBadge',
    ];
    expect(syncable).toHaveLength(5);
  });

  it('keeps cloud document paths family-scoped and pack-discovery identities deterministic', () => {
    expect(packDiscoveryDocumentId(learningPackId, discoveryId)).toBe('ocean-basics__blue-whale');
    expect(discoveryProgressPath(familyId, explorerId, discoveryId)).toBe(
      `families/${familyId}/explorers/${explorerId}/discoveryProgress/blue-whale`,
    );
    expect(packDiscoveryProgressPath(familyId, explorerId, learningPackId, discoveryId)).toContain(
      '/packDiscoveryProgress/ocean-basics__blue-whale',
    );
    expect(badgePath(familyId, explorerId, worldId)).toBe(
      `families/${familyId}/explorers/${explorerId}/badges/ocean`,
    );
  });

  it('strictly validates DTO schema, IDs, timestamps, and field allowlists', () => {
    const dto = toCloudDiscoveryProgressDto({
      explorerId,
      discoveryId,
      revealedAt: early,
      collectedAt: middle,
    });
    expect(parseCloudDiscoveryProgressDto(dto)).toEqual({
      explorerId,
      discoveryId,
      revealedAt: early,
      collectedAt: middle,
    });
    expect(() => parseCloudDiscoveryProgressDto({ ...dto, schemaVersion: 2 })).toThrow();
    expect(() => parseCloudDiscoveryProgressDto({ ...dto, discoveryId: 'not_valid' })).toThrow();
    expect(() => parseCloudDiscoveryProgressDto({ ...dto, revealedAt: 'yesterday' })).toThrow();
    expect(() => parseCloudDiscoveryProgressDto({ ...dto, extra: true })).toThrow();
  });

  it('round-trips supported state without transport-only fields', () => {
    const badge = { explorerId, worldId, earnedAt: early, contentRevision: 'world-r1' };
    expect(parseCloudEarnedBadgeDto(toCloudEarnedBadgeDto(badge))).toEqual(badge);
  });

  it('merges discovery state monotonically and repairs collected-without-revealed', () => {
    const unseen = { explorerId, discoveryId, revealedAt: null, collectedAt: null };
    const collected = { explorerId, discoveryId, revealedAt: null, collectedAt: middle };
    const revealed = { explorerId, discoveryId, revealedAt: early, collectedAt: null };
    expect(mergeDiscoveryProgress(unseen, collected)).toEqual({ ...collected, revealedAt: middle });
    expect(mergeDiscoveryProgress(revealed, collected)).toEqual({
      ...collected,
      revealedAt: early,
    });
    expect(mergeDiscoveryProgress(collected, unseen)).toEqual(
      mergeDiscoveryProgress(unseen, collected),
    );
    expect(mergeDiscoveryProgress(mergeDiscoveryProgress(unseen, revealed), collected)).toEqual(
      mergeDiscoveryProgress(unseen, mergeDiscoveryProgress(revealed, collected)),
    );
  });

  it('keeps pack-context state separate and monotonic', () => {
    const left = { explorerId, learningPackId, discoveryId, revealedAt: middle, completedAt: null };
    const right = { explorerId, learningPackId, discoveryId, revealedAt: early, completedAt: late };
    expect(mergePackDiscoveryProgress(left, right)).toEqual({ ...right, revealedAt: early });
    expect(mergePackDiscoveryProgress(left, right)).toEqual(
      mergePackDiscoveryProgress(right, left),
    );
    expect(() =>
      mergePackDiscoveryProgress(left, {
        ...right,
        learningPackId: parseLearningPackId('ocean-advanced'),
      }),
    ).toThrow();
    expect(
      parseCloudPackDiscoveryProgressDto({
        explorerId,
        learningPackId,
        discoveryId,
        revealedAt: early,
        completedAt: late,
        schemaVersion: 1,
      }),
    ).toEqual(right);
  });

  it('merges learning-pack history with the revision from the accepted completion', () => {
    const left = {
      explorerId,
      learningPackId,
      startedAt: middle,
      lastViewedAt: middle,
      completedAt: late,
      completionRevision: 'r2',
    };
    const right = {
      explorerId,
      learningPackId,
      startedAt: early,
      lastViewedAt: late,
      completedAt: middle,
      completionRevision: 'r1',
    };
    const merged = mergeLearningPackProgress(left, right);
    expect(merged).toEqual({ ...right, startedAt: early, lastViewedAt: late });
    expect(merged).toEqual(mergeLearningPackProgress(right, left));
    expect(mergeLearningPackProgress(merged, merged)).toEqual(merged);
    expect(parseCloudLearningPackProgressDto({ ...merged, schemaVersion: 1 })).toEqual(merged);
  });

  it('merges permanent badges using earliest earning and its revision', () => {
    const left = { explorerId, worldId, earnedAt: late, contentRevision: 'r2' };
    const right = { explorerId, worldId, earnedAt: early, contentRevision: 'r1' };
    const merged = mergeEarnedBadge(left, right);
    expect(merged).toEqual(right);
    expect(mergeEarnedBadge(left, right)).toEqual(mergeEarnedBadge(right, left));
    expect(mergeEarnedBadge(merged, merged)).toEqual(merged);
  });
});
