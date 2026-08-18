import type { AuthUserId, FamilyId } from '@app-types/domain/ids';
import type { CloudSyncResult } from '@app-types/domain/cloud';
import type {
  CloudDiscoveryProgressDto,
  CloudEarnedBadgeDto,
  CloudExplorerDto,
  CloudExplorerStateDto,
  CloudFamilyDto,
  CloudFamilyMemberDto,
  CloudLearningPackProgressDto,
  CloudPackDiscoveryProgressDto,
} from '@app-types/cloud/dto';

/** Infrastructure-neutral cloud replication boundary. No screen imports this contract directly. */
export interface CloudSyncRepositoryContract {
  getFamily(familyId: FamilyId): Promise<CloudFamilyDto | null>;
  getFamilyMembership(
    familyId: FamilyId,
    authUserId: AuthUserId,
  ): Promise<CloudFamilyMemberDto | null>;
  pullExplorerState(
    familyId: FamilyId,
    explorer: CloudExplorerDto,
  ): Promise<CloudExplorerStateDto | null>;
  upsertExplorer(familyId: FamilyId, value: CloudExplorerDto): Promise<CloudSyncResult>;
  upsertDiscoveryProgress(
    familyId: FamilyId,
    value: CloudDiscoveryProgressDto,
  ): Promise<CloudSyncResult>;
  upsertPackDiscoveryProgress(
    familyId: FamilyId,
    value: CloudPackDiscoveryProgressDto,
  ): Promise<CloudSyncResult>;
  upsertLearningPackProgress(
    familyId: FamilyId,
    value: CloudLearningPackProgressDto,
  ): Promise<CloudSyncResult>;
  upsertBadge(familyId: FamilyId, value: CloudEarnedBadgeDto): Promise<CloudSyncResult>;
}
