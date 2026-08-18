import type { CloudSyncError, SyncEntityType, SyncOperation } from '@app-types/domain/cloud';
import type { FamilyId } from '@app-types/domain/ids';

export interface EnqueueSyncOperationInput {
  operationId: string;
  familyId: FamilyId;
  entityType: SyncEntityType;
  entityId: string;
  createdAt: string;
}

/** Durable, transport-neutral entity-reference queue for future replication. */
export interface SyncOutboxRepositoryContract {
  enqueue(input: EnqueueSyncOperationInput): Promise<SyncOperation>;
  listPending(familyId: FamilyId, limit: number): Promise<SyncOperation[]>;
  countPending(familyId: FamilyId): Promise<number>;
  removeDelivered(operationId: string): Promise<void>;
  recordAttemptFailure(
    operationId: string,
    errorCode: CloudSyncError,
    attemptedAt: string,
  ): Promise<void>;
}
