import type {
  DiscoveryProgress,
  EarnedBadge,
  LearningPackProgress,
  PackDiscoveryProgress,
} from '@app-types/domain/progress';

import { isValidEventTimestamp } from '../cloudDtoMappers';

function assertSame(left: string, right: string, label: string): void {
  if (left !== right) throw new Error(`Cannot merge ${label} records with different identities.`);
}

function earliestTimestamp(...values: (string | null)[]): string | null {
  const valid = values.filter(isValidEventTimestamp);
  return valid.length === 0
    ? null
    : valid.reduce((earliest, value) => (value < earliest ? value : earliest));
}

function latestTimestamp(...values: (string | null)[]): string | null {
  const valid = values.filter(isValidEventTimestamp);
  return valid.length === 0
    ? null
    : valid.reduce((latest, value) => (value > latest ? value : latest));
}

function requiredEarliest(label: string, ...values: string[]): string {
  const result = earliestTimestamp(...values);
  if (!result) throw new Error(`${label} requires at least one valid ISO UTC timestamp.`);
  return result;
}

function requiredLatest(label: string, ...values: string[]): string {
  const result = latestTimestamp(...values);
  if (!result) throw new Error(`${label} requires at least one valid ISO UTC timestamp.`);
  return result;
}

function selectAssociatedRevision(
  leftTimestamp: string | null,
  leftRevision: string | null,
  rightTimestamp: string | null,
  rightRevision: string | null,
): { timestamp: string | null; revision: string | null } {
  const timestamp = earliestTimestamp(leftTimestamp, rightTimestamp);
  if (!timestamp) return { timestamp: null, revision: null };
  const candidates = [
    { timestamp: leftTimestamp, revision: leftRevision },
    { timestamp: rightTimestamp, revision: rightRevision },
  ].filter((candidate) => candidate.timestamp === timestamp);
  const revisions = candidates
    .map((candidate) => candidate.revision)
    .filter((revision): revision is string => revision !== null)
    .sort();
  return { timestamp, revision: revisions[0] ?? null };
}

/**
 * Monotonic merge for global discovery knowledge. Invalid timestamps are ignored;
 * collection repairs a missing reveal by using its own event time as the fallback.
 */
export function mergeDiscoveryProgress(
  left: DiscoveryProgress,
  right: DiscoveryProgress,
): DiscoveryProgress {
  assertSame(left.explorerId, right.explorerId, 'discovery progress explorer');
  assertSame(left.discoveryId, right.discoveryId, 'discovery progress discovery');
  const collectedAt = earliestTimestamp(left.collectedAt, right.collectedAt);
  return {
    explorerId: left.explorerId,
    discoveryId: left.discoveryId,
    revealedAt: earliestTimestamp(left.revealedAt, right.revealedAt, collectedAt),
    collectedAt,
  };
}

/** Pack membership is part of the identity: no global discovery state is consulted. */
export function mergePackDiscoveryProgress(
  left: PackDiscoveryProgress,
  right: PackDiscoveryProgress,
): PackDiscoveryProgress {
  assertSame(left.explorerId, right.explorerId, 'pack discovery explorer');
  assertSame(left.learningPackId, right.learningPackId, 'pack discovery learning pack');
  assertSame(left.discoveryId, right.discoveryId, 'pack discovery discovery');
  const completedAt = earliestTimestamp(left.completedAt, right.completedAt);
  return {
    explorerId: left.explorerId,
    learningPackId: left.learningPackId,
    discoveryId: left.discoveryId,
    revealedAt: earliestTimestamp(left.revealedAt, right.revealedAt, completedAt),
    completedAt,
  };
}

export function mergeLearningPackProgress(
  left: LearningPackProgress,
  right: LearningPackProgress,
): LearningPackProgress {
  assertSame(left.explorerId, right.explorerId, 'learning pack explorer');
  assertSame(left.learningPackId, right.learningPackId, 'learning pack');
  const completion = selectAssociatedRevision(
    left.completedAt,
    left.completionRevision,
    right.completedAt,
    right.completionRevision,
  );
  return {
    explorerId: left.explorerId,
    learningPackId: left.learningPackId,
    startedAt: requiredEarliest('Learning pack progress', left.startedAt, right.startedAt),
    lastViewedAt: requiredLatest('Learning pack progress', left.lastViewedAt, right.lastViewedAt),
    completedAt: completion.timestamp,
    completionRevision: completion.revision,
  };
}

export function mergeEarnedBadge(left: EarnedBadge, right: EarnedBadge): EarnedBadge {
  assertSame(left.explorerId, right.explorerId, 'badge explorer');
  assertSame(left.worldId, right.worldId, 'badge world');
  const earning = selectAssociatedRevision(
    left.earnedAt,
    left.contentRevision,
    right.earnedAt,
    right.contentRevision,
  );
  if (!earning.timestamp)
    throw new Error('Badge merge requires a valid ISO UTC earnedAt timestamp.');
  return {
    explorerId: left.explorerId,
    worldId: left.worldId,
    earnedAt: earning.timestamp,
    contentRevision: earning.revision,
  };
}
