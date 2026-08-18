/** Versioned transport records only. They are not canonical domain models. */
export const CLOUD_SCHEMA_VERSION = 1 as const;

export interface CloudFamilyDto {
  familyId: string;
  createdAt: string;
  schemaVersion: number;
}

export interface CloudFamilyMemberDto {
  familyId: string;
  authUserId: string;
  role: 'parent';
  createdAt: string;
  schemaVersion: number;
}

export interface CloudExplorerDto {
  explorerId: string;
  lookId: string;
  createdAt: string;
  schemaVersion: number;
}

export interface CloudDiscoveryProgressDto {
  explorerId: string;
  discoveryId: string;
  revealedAt: string | null;
  collectedAt: string | null;
  schemaVersion: number;
}

export interface CloudPackDiscoveryProgressDto {
  explorerId: string;
  learningPackId: string;
  discoveryId: string;
  revealedAt: string | null;
  completedAt: string | null;
  schemaVersion: number;
}

export interface CloudLearningPackProgressDto {
  explorerId: string;
  learningPackId: string;
  startedAt: string;
  lastViewedAt: string;
  completedAt: string | null;
  completionRevision: string | null;
  schemaVersion: number;
}

export interface CloudEarnedBadgeDto {
  explorerId: string;
  worldId: string;
  earnedAt: string;
  contentRevision: string | null;
  schemaVersion: number;
}

export interface CloudExplorerStateDto {
  explorer: CloudExplorerDto;
  discoveryProgress: CloudDiscoveryProgressDto[];
  packDiscoveryProgress: CloudPackDiscoveryProgressDto[];
  learningPackProgress: CloudLearningPackProgressDto[];
  earnedBadges: CloudEarnedBadgeDto[];
}
