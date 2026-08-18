import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@database/client';
import type {
  DiscoveryProgress,
  EarnedBadge,
  Explorer,
  LearningPackProgress,
  PackDiscoveryProgress,
} from '@app-types/domain/progress';
import {
  parseDiscoveryId,
  parseExplorerId,
  parseLearningPackId,
  parseWorldId,
  type ExplorerId,
} from '@app-types/domain/ids';
import type { SyncOperation } from '@app-types/domain/cloud';

export type LocalSyncEntity =
  | { entityType: 'explorer'; value: Explorer }
  | { entityType: 'discoveryProgress'; value: DiscoveryProgress }
  | { entityType: 'packDiscoveryProgress'; value: PackDiscoveryProgress }
  | { entityType: 'learningPackProgress'; value: LearningPackProgress }
  | { entityType: 'earnedBadge'; value: EarnedBadge };

/** SQLite read/apply boundary for cloud transport. Its writes intentionally never enqueue an outbox row. */
export class SQLiteCloudSyncStateRepository {
  constructor(private readonly database: () => Promise<SQLiteDatabase> = getDatabase) {}

  async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    const db = await this.database();
    let value: T | undefined;
    await db.withTransactionAsync(async () => {
      value = await work();
    });
    return value as T;
  }

  async getExplorer(explorerId: ExplorerId): Promise<Explorer | null> {
    const db = await this.database();
    const row = await db.getFirstAsync<{
      id: string;
      look_id: Explorer['lookId'];
      created_at: string;
    }>('SELECT id, look_id, created_at FROM local_explorers WHERE id = ?;', explorerId);
    return row
      ? { id: parseExplorerId(row.id), lookId: row.look_id, createdAt: row.created_at }
      : null;
  }

  async getEntity(operation: SyncOperation): Promise<LocalSyncEntity | null> {
    const parts = operation.entityId.split('__');
    const db = await this.database();
    switch (operation.entityType) {
      case 'explorer': {
        if (parts.length !== 1) return null;
        const explorer = await this.getExplorer(parseExplorerId(parts[0]));
        return explorer ? { entityType: 'explorer', value: explorer } : null;
      }
      case 'discoveryProgress': {
        if (parts.length !== 2) return null;
        const row = await db.getFirstAsync<{
          explorer_id: string;
          discovery_id: string;
          revealed_at: string | null;
          collected_at: string | null;
        }>(
          `SELECT explorer_id, discovery_id, revealed_at, collected_at FROM discovery_progress
           WHERE explorer_id = ? AND discovery_id = ?;`,
          parseExplorerId(parts[0]),
          parseDiscoveryId(parts[1]),
        );
        return row
          ? {
              entityType: 'discoveryProgress',
              value: {
                explorerId: parseExplorerId(row.explorer_id),
                discoveryId: parseDiscoveryId(row.discovery_id),
                revealedAt: row.revealed_at,
                collectedAt: row.collected_at,
              },
            }
          : null;
      }
      case 'packDiscoveryProgress': {
        if (parts.length !== 3) return null;
        const row = await db.getFirstAsync<{
          explorer_id: string;
          learning_pack_id: string;
          discovery_id: string;
          revealed_at: string | null;
          completed_at: string | null;
        }>(
          `SELECT explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at
           FROM pack_discovery_progress WHERE explorer_id = ? AND learning_pack_id = ? AND discovery_id = ?;`,
          parseExplorerId(parts[0]),
          parseLearningPackId(parts[1]),
          parseDiscoveryId(parts[2]),
        );
        return row
          ? {
              entityType: 'packDiscoveryProgress',
              value: {
                explorerId: parseExplorerId(row.explorer_id),
                learningPackId: parseLearningPackId(row.learning_pack_id),
                discoveryId: parseDiscoveryId(row.discovery_id),
                revealedAt: row.revealed_at,
                completedAt: row.completed_at,
              },
            }
          : null;
      }
      case 'learningPackProgress': {
        if (parts.length !== 2) return null;
        const row = await db.getFirstAsync<{
          explorer_id: string;
          learning_pack_id: string;
          started_at: string;
          last_viewed_at: string;
          completed_at: string | null;
          completion_revision: string | null;
        }>(
          `SELECT explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision
           FROM learning_pack_progress WHERE explorer_id = ? AND learning_pack_id = ?;`,
          parseExplorerId(parts[0]),
          parseLearningPackId(parts[1]),
        );
        return row
          ? {
              entityType: 'learningPackProgress',
              value: {
                explorerId: parseExplorerId(row.explorer_id),
                learningPackId: parseLearningPackId(row.learning_pack_id),
                startedAt: row.started_at,
                lastViewedAt: row.last_viewed_at,
                completedAt: row.completed_at,
                completionRevision: row.completion_revision,
              },
            }
          : null;
      }
      case 'earnedBadge': {
        if (parts.length !== 2) return null;
        const row = await db.getFirstAsync<{
          explorer_id: string;
          world_id: string;
          earned_at: string;
          content_revision: string | null;
        }>(
          `SELECT explorer_id, world_id, earned_at, content_revision FROM earned_badges
           WHERE explorer_id = ? AND world_id = ?;`,
          parseExplorerId(parts[0]),
          parseWorldId(parts[1]),
        );
        return row
          ? {
              entityType: 'earnedBadge',
              value: {
                explorerId: parseExplorerId(row.explorer_id),
                worldId: parseWorldId(row.world_id),
                earnedAt: row.earned_at,
                contentRevision: row.content_revision,
              },
            }
          : null;
      }
    }
  }

  async applyDiscovery(value: DiscoveryProgress): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO discovery_progress (explorer_id, discovery_id, revealed_at, collected_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(explorer_id, discovery_id) DO UPDATE SET revealed_at = excluded.revealed_at,
       collected_at = excluded.collected_at, updated_at = excluded.updated_at;`,
      value.explorerId,
      value.discoveryId,
      value.revealedAt,
      value.collectedAt,
      new Date().toISOString(),
    );
  }

  async applyPackDiscovery(value: PackDiscoveryProgress): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO pack_discovery_progress
       (explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(explorer_id, learning_pack_id, discovery_id) DO UPDATE SET
       revealed_at = excluded.revealed_at, completed_at = excluded.completed_at, updated_at = excluded.updated_at;`,
      value.explorerId,
      value.learningPackId,
      value.discoveryId,
      value.revealedAt,
      value.completedAt,
      new Date().toISOString(),
    );
  }

  async applyLearningPack(value: LearningPackProgress): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO learning_pack_progress
       (explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(explorer_id, learning_pack_id) DO UPDATE SET started_at = excluded.started_at,
       last_viewed_at = excluded.last_viewed_at, completed_at = excluded.completed_at,
       completion_revision = excluded.completion_revision, updated_at = excluded.updated_at;`,
      value.explorerId,
      value.learningPackId,
      value.startedAt,
      value.lastViewedAt,
      value.completedAt,
      value.completionRevision,
      new Date().toISOString(),
    );
  }

  async applyBadge(value: EarnedBadge): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO earned_badges (explorer_id, world_id, earned_at, content_revision)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(explorer_id, world_id) DO UPDATE SET earned_at = excluded.earned_at,
       content_revision = excluded.content_revision;`,
      value.explorerId,
      value.worldId,
      value.earnedAt,
      value.contentRevision,
    );
  }
}
