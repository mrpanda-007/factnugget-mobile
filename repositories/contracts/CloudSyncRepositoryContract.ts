import type { FamilyId } from '@app-types/domain/ids';
import type { CloudSyncResult } from '@app-types/domain/cloud';
import type {
  CloudExplorerStateDto,
  CloudFamilyDto,
  CloudFamilyMemberDto,
} from '@app-types/cloud/dto';

/** Infrastructure-neutral cloud replication boundary. No screen imports this contract directly. */
export interface CloudSyncRepositoryContract {
  ensureFamily(family: CloudFamilyDto, member: CloudFamilyMemberDto): Promise<CloudSyncResult>;
  pullExplorerState(familyId: FamilyId): Promise<CloudExplorerStateDto[]>;
  upsertExplorerState(familyId: FamilyId, state: CloudExplorerStateDto): Promise<CloudSyncResult>;
}
