import type { CloudAccountBinding } from '@app-types/domain/cloud';
import type { AuthUserId, FamilyId } from '@app-types/domain/ids';

export interface BindCloudAccountInput {
  authUserId: AuthUserId;
  familyId: FamilyId;
  boundAt: string;
}

/** Device-local binding metadata only; Firebase Auth remains outside this contract. */
export interface CloudAccountBindingRepositoryContract {
  getCurrentBinding(): Promise<CloudAccountBinding>;
  bind(input: BindCloudAccountInput): Promise<CloudAccountBinding>;
  detach(): Promise<void>;
}
