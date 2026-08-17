import { getDatabase } from '@database/client';
import {
  decideLearningPackAccess,
  type EntitlementAccessPolicy,
} from '../../application/commerce/accessDecision';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Entitlement, EntitlementSource } from '@app-types/domain/commerce';
import type { LearningPack } from '@app-types/domain/content';
import {
  parseEntitlementId,
  parseLearningPackId,
  type LearningPackId,
} from '@app-types/domain/ids';
import type { EntitlementRepositoryContract } from '@repositories/contracts/EntitlementRepositoryContract';

interface EntitlementRow {
  id: string;
  subject_type: 'learningPack';
  subject_id: string;
  source: EntitlementSource;
  status: Entitlement['status'];
  granted_at: string;
  expires_at: string | null;
  last_verified_at: string | null;
  source_reference_hash: string | null;
  updated_at: string;
}

function toEntitlement(row: EntitlementRow): Entitlement {
  return {
    id: parseEntitlementId(row.id),
    subject: { type: 'learningPack', id: parseLearningPackId(row.subject_id) },
    source: row.source,
    status: row.status,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    lastVerifiedAt: row.last_verified_at,
    sourceReferenceHash: row.source_reference_hash,
    updatedAt: row.updated_at,
  };
}

export interface SQLiteEntitlementRepositoryOptions {
  database?: () => Promise<SQLiteDatabase>;
  allowedSources?: readonly EntitlementSource[];
  now?: () => string;
}

/** SQLite cache of store-derived access rights. It never calls a store SDK. */
export class SQLiteEntitlementRepository implements EntitlementRepositoryContract {
  private readonly database: () => Promise<SQLiteDatabase>;
  private readonly accessPolicy: EntitlementAccessPolicy;

  constructor(options: SQLiteEntitlementRepositoryOptions = {}) {
    this.database = options.database ?? getDatabase;
    this.accessPolicy = {
      allowedSources: options.allowedSources ?? ['apple', 'google'],
      now: options.now ?? (() => new Date().toISOString()),
    };
  }

  async getLearningPackAccess(learningPack: LearningPack) {
    if (learningPack.accessType === 'free') {
      return decideLearningPackAccess(learningPack, [], this.accessPolicy);
    }
    return decideLearningPackAccess(
      learningPack,
      await this.getEntitlementsForLearningPack(learningPack.id),
      this.accessPolicy,
    );
  }

  async listEntitlements(): Promise<Entitlement[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<EntitlementRow>(
      `SELECT id, subject_type, subject_id, source, status, granted_at, expires_at,
              last_verified_at, source_reference_hash, updated_at
       FROM local_entitlements ORDER BY updated_at DESC;`,
    );
    return rows.map(toEntitlement);
  }

  async getEntitlementsForLearningPack(learningPackId: LearningPackId): Promise<Entitlement[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<EntitlementRow>(
      `SELECT id, subject_type, subject_id, source, status, granted_at, expires_at,
              last_verified_at, source_reference_hash, updated_at
       FROM local_entitlements
       WHERE subject_type = 'learningPack' AND subject_id = ?
       ORDER BY updated_at DESC;`,
      learningPackId,
    );
    return rows.map(toEntitlement);
  }

  async upsertEntitlement(entitlement: Entitlement): Promise<Entitlement> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO local_entitlements
         (id, subject_type, subject_id, source, status, granted_at, expires_at,
          last_verified_at, source_reference_hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(subject_type, subject_id, source) DO UPDATE SET
         status = excluded.status,
         granted_at = excluded.granted_at,
         expires_at = excluded.expires_at,
         last_verified_at = excluded.last_verified_at,
         source_reference_hash = excluded.source_reference_hash,
         updated_at = excluded.updated_at;`,
      entitlement.id,
      entitlement.subject.type,
      entitlement.subject.id,
      entitlement.source,
      entitlement.status,
      entitlement.grantedAt,
      entitlement.expiresAt,
      entitlement.lastVerifiedAt,
      entitlement.sourceReferenceHash,
      entitlement.updatedAt,
    );
    const stored = (await this.getEntitlementsForLearningPack(entitlement.subject.id)).find(
      (candidate) => candidate.source === entitlement.source,
    );
    if (!stored) throw new Error('Entitlement upsert did not return a stored record.');
    return stored;
  }
}
