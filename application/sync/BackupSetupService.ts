import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@database/client';
import type { CloudSyncResult } from '@app-types/domain/cloud';
import type { AuthUserId, ExplorerId, FamilyId } from '@app-types/domain/ids';
import { createSyncOperationId } from '@app-types/domain/ids';
import type { CloudAccountBindingRepositoryContract } from '@repositories/contracts/CloudAccountBindingRepositoryContract';
import type { SyncOutboxRepositoryContract } from '@repositories/contracts/SyncOutboxRepositoryContract';

import { syncEntityReferences, type SyncEntityReference } from './LocalSyncQueueService';
import type { SyncServiceContract } from './SyncServiceContract';

export type BackupSetupResult =
  | { state: 'ready'; pendingCount: number; explorerIds: ExplorerId[] }
  | { state: 'accountSwitchRequired' }
  | { state: 'failure'; error: 'localFailure' };

interface BackupSetupDependencies {
  database?: () => Promise<SQLiteDatabase>;
  bindings: CloudAccountBindingRepositoryContract;
  outbox: SyncOutboxRepositoryContract;
  sync: Pick<SyncServiceContract, 'pushPending' | 'pullExplorer'>;
  now?: () => string;
  /** Test-only interrupt point proving one SQLite transaction rolls back all setup changes. */
  beforeSeedReference?: (reference: SyncEntityReference) => Promise<void> | void;
}

interface ExplorerRow {
  id: string;
}
interface DiscoveryRow {
  explorer_id: string;
  discovery_id: string;
}
interface PackDiscoveryRow {
  explorer_id: string;
  learning_pack_id: string;
  discovery_id: string;
}
interface LearningPackRow {
  explorer_id: string;
  learning_pack_id: string;
}
interface BadgeRow {
  explorer_id: string;
  world_id: string;
}

/**
 * Binds one verified Family to this device and seeds only entity references.
 * Binding and every initial queue entry share the same V4 SQLite transaction.
 */
export class BackupSetupService {
  private readonly database: () => Promise<SQLiteDatabase>;
  private readonly now: () => string;

  constructor(private readonly dependencies: BackupSetupDependencies) {
    this.database = dependencies.database ?? getDatabase;
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async bindAndSeed(authUserId: AuthUserId, familyId: FamilyId): Promise<BackupSetupResult> {
    const existing = await this.dependencies.bindings.getCurrentBinding();
    if (
      existing.state !== 'unbound' &&
      (existing.authUserId !== authUserId || existing.familyId !== familyId)
    ) {
      return { state: 'accountSwitchRequired' };
    }

    try {
      const db = await this.database();
      let explorerIds: ExplorerId[] = [];
      await db.withTransactionAsync(async () => {
        const now = this.now();
        if (existing.state === 'unbound') {
          await db.runAsync(
            `INSERT INTO cloud_account_binding
             (singleton_id, auth_user_id, family_id, binding_state, bound_at, updated_at)
             VALUES (1, ?, ?, 'bound', ?, ?);`,
            authUserId,
            familyId,
            now,
            now,
          );
        }
        const references = await this.readAllReferences(db);
        explorerIds = references.explorerIds;
        for (const reference of references.values) {
          await this.dependencies.beforeSeedReference?.(reference);
          await db.runAsync(
            `INSERT INTO sync_outbox
             (operation_id, family_id, entity_type, entity_id, operation_type, created_at)
             VALUES (?, ?, ?, ?, 'upsert', ?)
             ON CONFLICT(family_id, entity_type, entity_id, operation_type) DO NOTHING;`,
            createSyncOperationId(),
            familyId,
            reference.entityType,
            reference.entityId,
            now,
          );
        }
      });
      return {
        state: 'ready',
        pendingCount: await this.dependencies.outbox.countPending(familyId),
        explorerIds,
      };
    } catch {
      return { state: 'failure', error: 'localFailure' };
    }
  }

  /** Push once, then pull each already-local UUID. Unknown remote Explorers are never created. */
  async syncSeeded(explorerIds: ExplorerId[]): Promise<CloudSyncResult> {
    const pushed = await this.dependencies.sync.pushPending();
    if (pushed.state === 'failure') return pushed;
    let pulled = 0;
    let merged = 0;
    for (const explorerId of [...explorerIds].sort()) {
      const result = await this.dependencies.sync.pullExplorer(explorerId);
      if (result.state !== 'success') {
        return {
          state: 'partial',
          error: result.error,
          pushed: pushed.pushed,
          pulled,
          merged,
          remainingPending: await this.pendingCount(),
        };
      }
      pulled += result.pulled ?? 0;
      merged += result.merged ?? 0;
    }
    const remainingPending = await this.pendingCount();
    return { state: 'success', pushed: pushed.pushed, pulled, merged, remainingPending };
  }

  async listLocalExplorerIds(): Promise<ExplorerId[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<ExplorerRow>(
      'SELECT id FROM local_explorers ORDER BY id ASC;',
    );
    return rows.map((row) => row.id as ExplorerId);
  }

  private async pendingCount(): Promise<number> {
    const binding = await this.dependencies.bindings.getCurrentBinding();
    return binding.state === 'bound' ? this.dependencies.outbox.countPending(binding.familyId) : 0;
  }

  private async readAllReferences(db: SQLiteDatabase): Promise<{
    explorerIds: ExplorerId[];
    values: SyncEntityReference[];
  }> {
    const [explorers, discovery, packDiscovery, packs, badges] = await Promise.all([
      db.getAllAsync<ExplorerRow>('SELECT id FROM local_explorers ORDER BY id ASC;'),
      db.getAllAsync<DiscoveryRow>(
        'SELECT explorer_id, discovery_id FROM discovery_progress ORDER BY explorer_id, discovery_id;',
      ),
      db.getAllAsync<PackDiscoveryRow>(
        'SELECT explorer_id, learning_pack_id, discovery_id FROM pack_discovery_progress ORDER BY explorer_id, learning_pack_id, discovery_id;',
      ),
      db.getAllAsync<LearningPackRow>(
        'SELECT explorer_id, learning_pack_id FROM learning_pack_progress ORDER BY explorer_id, learning_pack_id;',
      ),
      db.getAllAsync<BadgeRow>(
        'SELECT explorer_id, world_id FROM earned_badges ORDER BY explorer_id, world_id;',
      ),
    ]);
    const explorerIds = explorers.map((row) => row.id as ExplorerId);
    return {
      explorerIds,
      values: [
        ...explorerIds.map(syncEntityReferences.explorer),
        ...discovery.map((row) =>
          syncEntityReferences.discoveryProgress(
            row.explorer_id as ExplorerId,
            row.discovery_id as never,
          ),
        ),
        ...packDiscovery.map((row) =>
          syncEntityReferences.packDiscoveryProgress(
            row.explorer_id as ExplorerId,
            row.learning_pack_id as never,
            row.discovery_id as never,
          ),
        ),
        ...packs.map((row) =>
          syncEntityReferences.learningPackProgress(
            row.explorer_id as ExplorerId,
            row.learning_pack_id as never,
          ),
        ),
        ...badges.map((row) =>
          syncEntityReferences.earnedBadge(row.explorer_id as ExplorerId, row.world_id as never),
        ),
      ],
    };
  }
}
