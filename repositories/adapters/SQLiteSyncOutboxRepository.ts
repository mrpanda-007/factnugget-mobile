import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@database/client';
import type { CloudSyncError, SyncEntityType, SyncOperation } from '@app-types/domain/cloud';
import { parseFamilyId } from '@app-types/domain/ids';
import type {
  EnqueueSyncOperationInput,
  SyncOutboxRepositoryContract,
} from '@repositories/contracts/SyncOutboxRepositoryContract';

interface OutboxRow {
  operation_id: string;
  family_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  created_at: string;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
}

const ENTITY_TYPES: readonly SyncEntityType[] = [
  'explorer',
  'discoveryProgress',
  'packDiscoveryProgress',
  'learningPackProgress',
  'earnedBadge',
];
const ERROR_CODES: readonly CloudSyncError[] = [
  'offline',
  'authRequired',
  'permissionDenied',
  'retryableFailure',
  'invalidRemoteData',
  'invalidLocalData',
  'notFound',
  'rateLimited',
  'resourceExhausted',
  'permanentFailure',
  'unknownFailure',
  'bindingMismatch',
  'unbound',
  'unavailable',
];

function toOperation(row: OutboxRow): SyncOperation {
  if (
    !ENTITY_TYPES.includes(row.entity_type as SyncEntityType) ||
    row.operation_type !== 'upsert'
  ) {
    throw new Error('Sync outbox contains an unsupported operation.');
  }
  if (row.operation_id.trim().length === 0 || row.entity_id.trim().length === 0) {
    throw new Error('Sync outbox contains an invalid operation identity.');
  }
  if (row.last_error_code && !ERROR_CODES.includes(row.last_error_code as CloudSyncError)) {
    throw new Error('Sync outbox contains an invalid failure code.');
  }
  return {
    operationId: row.operation_id,
    familyId: parseFamilyId(row.family_id),
    entityType: row.entity_type as SyncEntityType,
    entityId: row.entity_id,
    operation: 'upsert',
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    lastErrorCode: row.last_error_code as CloudSyncError | null,
  };
}

/** SQLite-backed queue with immutable family ownership and coalescing entity-reference upserts. */
export class SQLiteSyncOutboxRepository implements SyncOutboxRepositoryContract {
  constructor(private readonly database: () => Promise<SQLiteDatabase> = getDatabase) {}

  async enqueue(input: EnqueueSyncOperationInput): Promise<SyncOperation> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO sync_outbox
       (operation_id, family_id, entity_type, entity_id, operation_type, created_at)
       VALUES (?, ?, ?, ?, 'upsert', ?)
       ON CONFLICT(family_id, entity_type, entity_id, operation_type) DO NOTHING;`,
      input.operationId,
      input.familyId,
      input.entityType,
      input.entityId,
      input.createdAt,
    );
    const row = await db.getFirstAsync<OutboxRow>(
      `SELECT operation_id, family_id, entity_type, entity_id, operation_type, created_at,
              attempt_count, last_attempt_at, last_error_code
       FROM sync_outbox
       WHERE family_id = ? AND entity_type = ? AND entity_id = ? AND operation_type = 'upsert';`,
      input.familyId,
      input.entityType,
      input.entityId,
    );
    if (!row) throw new Error('Sync outbox enqueue did not persist an operation.');
    return toOperation(row);
  }

  async listPending(familyId: SyncOperation['familyId'], limit: number): Promise<SyncOperation[]> {
    if (!Number.isInteger(limit) || limit <= 0)
      throw new Error('Sync outbox limit must be positive.');
    const db = await this.database();
    const rows = await db.getAllAsync<OutboxRow>(
      `SELECT operation_id, family_id, entity_type, entity_id, operation_type, created_at,
              attempt_count, last_attempt_at, last_error_code
       FROM sync_outbox WHERE family_id = ?
       ORDER BY created_at ASC, operation_id ASC LIMIT ?;`,
      familyId,
      limit,
    );
    return rows.map(toOperation);
  }

  async countPending(familyId: SyncOperation['familyId']): Promise<number> {
    const db = await this.database();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM sync_outbox WHERE family_id = ?;',
      familyId,
    );
    return row?.count ?? 0;
  }

  async removeDelivered(operationId: string): Promise<void> {
    const db = await this.database();
    await db.runAsync('DELETE FROM sync_outbox WHERE operation_id = ?;', operationId);
  }

  async recordAttemptFailure(
    operationId: string,
    errorCode: CloudSyncError,
    attemptedAt: string,
  ): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `UPDATE sync_outbox
       SET attempt_count = attempt_count + 1, last_attempt_at = ?, last_error_code = ?
       WHERE operation_id = ?;`,
      attemptedAt,
      errorCode,
      operationId,
    );
  }
}
