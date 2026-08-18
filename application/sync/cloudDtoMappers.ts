import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { Family, FamilyMember } from '@app-types/domain/cloud';
import type {
  Explorer,
  DiscoveryProgress,
  EarnedBadge,
  LearningPackProgress,
  PackDiscoveryProgress,
} from '@app-types/domain/progress';
import {
  parseAuthUserId,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
  parseLearningPackId,
  parseWorldId,
} from '@app-types/domain/ids';
import {
  CLOUD_SCHEMA_VERSION,
  type CloudDiscoveryProgressDto,
  type CloudEarnedBadgeDto,
  type CloudExplorerDto,
  type CloudFamilyDto,
  type CloudFamilyMemberDto,
  type CloudLearningPackProgressDto,
  type CloudPackDiscoveryProgressDto,
} from '@app-types/cloud/dto';

const LOOK_IDS: readonly ExplorerIdentityId[] = ['animal', 'space', 'ocean', 'world'];

export function isValidEventTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function requireTimestamp(value: unknown, label: string): string {
  if (!isValidEventTimestamp(value)) throw new Error(`${label} must be an ISO UTC timestamp.`);
  return value;
}

function optionalTimestamp(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requireTimestamp(value, label);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  return value;
}

function optionalString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requireString(value, label);
}

function objectWithKeys(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has unexpected or missing fields.`);
  }
  return record;
}

function requireSchemaVersion(value: unknown): number {
  if (value !== CLOUD_SCHEMA_VERSION)
    throw new Error(`Unsupported cloud schema version: ${String(value)}.`);
  return CLOUD_SCHEMA_VERSION;
}

function parseLookId(value: unknown): ExplorerIdentityId {
  if (typeof value !== 'string' || !LOOK_IDS.includes(value as ExplorerIdentityId)) {
    throw new Error('Explorer look ID is invalid.');
  }
  return value as ExplorerIdentityId;
}

export function toCloudFamilyDto(family: Family): CloudFamilyDto {
  return { familyId: family.id, createdAt: family.createdAt, schemaVersion: CLOUD_SCHEMA_VERSION };
}

export function parseCloudFamilyDto(value: unknown): Family {
  const dto = objectWithKeys(value, ['familyId', 'createdAt', 'schemaVersion'], 'Cloud family DTO');
  return {
    id: parseFamilyId(requireString(dto.familyId, 'familyId')),
    createdAt: requireTimestamp(dto.createdAt, 'createdAt'),
    schemaVersion: requireSchemaVersion(dto.schemaVersion),
  };
}

export function toCloudFamilyMemberDto(member: FamilyMember): CloudFamilyMemberDto {
  return {
    familyId: member.familyId,
    authUserId: member.authUserId,
    role: member.role,
    createdAt: member.createdAt,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function parseCloudFamilyMemberDto(value: unknown): FamilyMember {
  const dto = objectWithKeys(
    value,
    ['familyId', 'authUserId', 'role', 'createdAt', 'schemaVersion'],
    'Cloud family member DTO',
  );
  if (dto.role !== 'parent') throw new Error('Family member role is invalid.');
  requireSchemaVersion(dto.schemaVersion);
  return {
    familyId: parseFamilyId(requireString(dto.familyId, 'familyId')),
    authUserId: parseAuthUserId(requireString(dto.authUserId, 'authUserId')),
    role: 'parent',
    createdAt: requireTimestamp(dto.createdAt, 'createdAt'),
  };
}

export function toCloudExplorerDto(explorer: Explorer): CloudExplorerDto {
  return {
    explorerId: explorer.id,
    lookId: explorer.lookId,
    createdAt: explorer.createdAt,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function parseCloudExplorerDto(value: unknown): Explorer {
  const dto = objectWithKeys(
    value,
    ['explorerId', 'lookId', 'createdAt', 'schemaVersion'],
    'Cloud explorer DTO',
  );
  requireSchemaVersion(dto.schemaVersion);
  return {
    id: parseExplorerId(requireString(dto.explorerId, 'explorerId')),
    lookId: parseLookId(dto.lookId),
    createdAt: requireTimestamp(dto.createdAt, 'createdAt'),
  };
}

export function toCloudDiscoveryProgressDto(
  progress: DiscoveryProgress,
): CloudDiscoveryProgressDto {
  return {
    explorerId: progress.explorerId,
    discoveryId: progress.discoveryId,
    revealedAt: progress.revealedAt,
    collectedAt: progress.collectedAt,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function parseCloudDiscoveryProgressDto(value: unknown): DiscoveryProgress {
  const dto = objectWithKeys(
    value,
    ['explorerId', 'discoveryId', 'revealedAt', 'collectedAt', 'schemaVersion'],
    'Cloud discovery progress DTO',
  );
  requireSchemaVersion(dto.schemaVersion);
  return {
    explorerId: parseExplorerId(requireString(dto.explorerId, 'explorerId')),
    discoveryId: parseDiscoveryId(requireString(dto.discoveryId, 'discoveryId')),
    revealedAt: optionalTimestamp(dto.revealedAt, 'revealedAt'),
    collectedAt: optionalTimestamp(dto.collectedAt, 'collectedAt'),
  };
}

export function toCloudPackDiscoveryProgressDto(
  progress: PackDiscoveryProgress,
): CloudPackDiscoveryProgressDto {
  return {
    explorerId: progress.explorerId,
    learningPackId: progress.learningPackId,
    discoveryId: progress.discoveryId,
    revealedAt: progress.revealedAt,
    completedAt: progress.completedAt,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function parseCloudPackDiscoveryProgressDto(value: unknown): PackDiscoveryProgress {
  const dto = objectWithKeys(
    value,
    ['explorerId', 'learningPackId', 'discoveryId', 'revealedAt', 'completedAt', 'schemaVersion'],
    'Cloud pack discovery progress DTO',
  );
  requireSchemaVersion(dto.schemaVersion);
  return {
    explorerId: parseExplorerId(requireString(dto.explorerId, 'explorerId')),
    learningPackId: parseLearningPackId(requireString(dto.learningPackId, 'learningPackId')),
    discoveryId: parseDiscoveryId(requireString(dto.discoveryId, 'discoveryId')),
    revealedAt: optionalTimestamp(dto.revealedAt, 'revealedAt'),
    completedAt: optionalTimestamp(dto.completedAt, 'completedAt'),
  };
}

export function toCloudLearningPackProgressDto(
  progress: LearningPackProgress,
): CloudLearningPackProgressDto {
  return {
    explorerId: progress.explorerId,
    learningPackId: progress.learningPackId,
    startedAt: progress.startedAt,
    lastViewedAt: progress.lastViewedAt,
    completedAt: progress.completedAt,
    completionRevision: progress.completionRevision,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function parseCloudLearningPackProgressDto(value: unknown): LearningPackProgress {
  const dto = objectWithKeys(
    value,
    [
      'explorerId',
      'learningPackId',
      'startedAt',
      'lastViewedAt',
      'completedAt',
      'completionRevision',
      'schemaVersion',
    ],
    'Cloud learning pack progress DTO',
  );
  const completedAt = optionalTimestamp(dto.completedAt, 'completedAt');
  const completionRevision = optionalString(dto.completionRevision, 'completionRevision');
  if (!completedAt && completionRevision !== null)
    throw new Error('completionRevision requires completedAt.');
  requireSchemaVersion(dto.schemaVersion);
  return {
    explorerId: parseExplorerId(requireString(dto.explorerId, 'explorerId')),
    learningPackId: parseLearningPackId(requireString(dto.learningPackId, 'learningPackId')),
    startedAt: requireTimestamp(dto.startedAt, 'startedAt'),
    lastViewedAt: requireTimestamp(dto.lastViewedAt, 'lastViewedAt'),
    completedAt,
    completionRevision,
  };
}

export function toCloudEarnedBadgeDto(badge: EarnedBadge): CloudEarnedBadgeDto {
  return {
    explorerId: badge.explorerId,
    worldId: badge.worldId,
    earnedAt: badge.earnedAt,
    contentRevision: badge.contentRevision,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function parseCloudEarnedBadgeDto(value: unknown): EarnedBadge {
  const dto = objectWithKeys(
    value,
    ['explorerId', 'worldId', 'earnedAt', 'contentRevision', 'schemaVersion'],
    'Cloud badge DTO',
  );
  requireSchemaVersion(dto.schemaVersion);
  return {
    explorerId: parseExplorerId(requireString(dto.explorerId, 'explorerId')),
    worldId: parseWorldId(requireString(dto.worldId, 'worldId')),
    earnedAt: requireTimestamp(dto.earnedAt, 'earnedAt'),
    contentRevision: optionalString(dto.contentRevision, 'contentRevision'),
  };
}
