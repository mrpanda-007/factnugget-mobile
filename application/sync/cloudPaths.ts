import type {
  AuthUserId,
  FamilyId,
  DiscoveryId,
  ExplorerId,
  LearningPackId,
  WorldId,
} from '@app-types/domain/ids';

const FAMILIES = 'families';

export function packDiscoveryDocumentId(
  learningPackId: LearningPackId,
  discoveryId: DiscoveryId,
): string {
  // Canonical content IDs cannot contain underscores, so __ is an unambiguous delimiter.
  return `${learningPackId}__${discoveryId}`;
}

export function familyPath(familyId: FamilyId): string {
  return `${FAMILIES}/${familyId}`;
}

export function familyMemberPath(familyId: FamilyId, authUserId: AuthUserId): string {
  return `${familyPath(familyId)}/members/${authUserId}`;
}

export function explorerPath(familyId: FamilyId, explorerId: ExplorerId): string {
  return `${familyPath(familyId)}/explorers/${explorerId}`;
}

export function discoveryProgressPath(
  familyId: FamilyId,
  explorerId: ExplorerId,
  discoveryId: DiscoveryId,
): string {
  return `${explorerPath(familyId, explorerId)}/discoveryProgress/${discoveryId}`;
}

export function packDiscoveryProgressPath(
  familyId: FamilyId,
  explorerId: ExplorerId,
  learningPackId: LearningPackId,
  discoveryId: DiscoveryId,
): string {
  return `${explorerPath(familyId, explorerId)}/packDiscoveryProgress/${packDiscoveryDocumentId(learningPackId, discoveryId)}`;
}

export function learningPackProgressPath(
  familyId: FamilyId,
  explorerId: ExplorerId,
  learningPackId: LearningPackId,
): string {
  return `${explorerPath(familyId, explorerId)}/learningPackProgress/${learningPackId}`;
}

export function badgePath(familyId: FamilyId, explorerId: ExplorerId, worldId: WorldId): string {
  return `${explorerPath(familyId, explorerId)}/badges/${worldId}`;
}
