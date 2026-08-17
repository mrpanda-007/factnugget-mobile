import { getDatabase } from '@database/client';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { ProgressRepositoryContract } from '@repositories/contracts/ProgressRepositoryContract';
import type { DiscoveryId, ExplorerId, LearningPackId, WorldId } from '@app-types/domain/ids';
import type {
  DiscoveryProgress,
  EarnedBadge,
  LearningPackProgress,
  PackDiscoveryProgress,
} from '@app-types/domain/progress';

interface DiscoveryRow {
  explorer_id: ExplorerId;
  discovery_id: DiscoveryId;
  revealed_at: string | null;
  collected_at: string | null;
}
interface PackDiscoveryRow extends DiscoveryRow {
  learning_pack_id: LearningPackId;
  completed_at: string | null;
}
interface PackRow {
  explorer_id: ExplorerId;
  learning_pack_id: LearningPackId;
  started_at: string;
  last_viewed_at: string;
  completed_at: string | null;
  completion_revision: string | null;
}
interface BadgeRow {
  explorer_id: ExplorerId;
  world_id: WorldId;
  earned_at: string;
  content_revision: string | null;
}

const toDiscoveryProgress = (row: DiscoveryRow): DiscoveryProgress => ({
  explorerId: row.explorer_id,
  discoveryId: row.discovery_id,
  revealedAt: row.revealed_at,
  collectedAt: row.collected_at,
});
const toPackDiscoveryProgress = (row: PackDiscoveryRow): PackDiscoveryProgress => ({
  explorerId: row.explorer_id,
  learningPackId: row.learning_pack_id,
  discoveryId: row.discovery_id,
  revealedAt: row.revealed_at,
  completedAt: row.completed_at,
});
const toLearningPackProgress = (row: PackRow): LearningPackProgress => ({
  explorerId: row.explorer_id,
  learningPackId: row.learning_pack_id,
  startedAt: row.started_at,
  lastViewedAt: row.last_viewed_at,
  completedAt: row.completed_at,
  completionRevision: row.completion_revision,
});
const toBadge = (row: BadgeRow): EarnedBadge => ({
  explorerId: row.explorer_id,
  worldId: row.world_id,
  earnedAt: row.earned_at,
  contentRevision: row.content_revision,
});

/** SQLite implementation of the Phase 5B Explorer-scoped progress contract. */
export class SQLiteProgressRepository implements ProgressRepositoryContract {
  constructor(private readonly database: () => Promise<SQLiteDatabase> = getDatabase) {}

  async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    const db = await this.database();
    let value: T | undefined;
    await db.withTransactionAsync(async () => {
      value = await work();
    });
    return value as T;
  }

  async getDiscoveryProgress(
    explorerId: ExplorerId,
    discoveryId: DiscoveryId,
  ): Promise<DiscoveryProgress | null> {
    const db = await this.database();
    const row = await db.getFirstAsync<DiscoveryRow>(
      `SELECT explorer_id, discovery_id, revealed_at, collected_at FROM discovery_progress
       WHERE explorer_id = ? AND discovery_id = ?;`,
      explorerId,
      discoveryId,
    );
    return row ? toDiscoveryProgress(row) : null;
  }

  async listCollectedDiscoveryIds(explorerId: ExplorerId): Promise<DiscoveryId[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<Pick<DiscoveryRow, 'discovery_id'>>(
      `SELECT discovery_id FROM discovery_progress
       WHERE explorer_id = ? AND collected_at IS NOT NULL ORDER BY collected_at DESC;`,
      explorerId,
    );
    return rows.map((row) => row.discovery_id);
  }

  async listCollectedDiscoveries(
    explorerId: ExplorerId,
  ): Promise<{ discoveryId: DiscoveryId; collectedAt: string }[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<Pick<DiscoveryRow, 'discovery_id' | 'collected_at'>>(
      `SELECT discovery_id, collected_at FROM discovery_progress
       WHERE explorer_id = ? AND collected_at IS NOT NULL ORDER BY collected_at DESC;`,
      explorerId,
    );
    return rows.map((row) => ({ discoveryId: row.discovery_id, collectedAt: row.collected_at! }));
  }

  async markDiscoveryRevealed(write: {
    explorerId: ExplorerId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const db = await this.database();
    const result = await db.runAsync(
      `INSERT INTO discovery_progress (explorer_id, discovery_id, revealed_at, collected_at, updated_at)
       VALUES (?, ?, ?, NULL, ?)
       ON CONFLICT(explorer_id, discovery_id) DO UPDATE SET
         revealed_at = COALESCE(discovery_progress.revealed_at, excluded.revealed_at),
         updated_at = CASE WHEN discovery_progress.revealed_at IS NULL THEN excluded.updated_at ELSE discovery_progress.updated_at END
       WHERE discovery_progress.revealed_at IS NULL;`,
      write.explorerId,
      write.discoveryId,
      write.occurredAt,
      write.occurredAt,
    );
    return result.changes > 0;
  }

  async collectDiscovery(write: {
    explorerId: ExplorerId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const db = await this.database();
    const result = await db.runAsync(
      `INSERT INTO discovery_progress (explorer_id, discovery_id, revealed_at, collected_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(explorer_id, discovery_id) DO UPDATE SET
         revealed_at = COALESCE(discovery_progress.revealed_at, excluded.revealed_at),
         collected_at = excluded.collected_at, updated_at = excluded.updated_at
       WHERE discovery_progress.collected_at IS NULL;`,
      write.explorerId,
      write.discoveryId,
      write.occurredAt,
      write.occurredAt,
      write.occurredAt,
    );
    return result.changes > 0;
  }

  async getPackDiscoveryProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    discoveryId: DiscoveryId,
  ): Promise<PackDiscoveryProgress | null> {
    const db = await this.database();
    const row = await db.getFirstAsync<PackDiscoveryRow>(
      `SELECT explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at
       FROM pack_discovery_progress WHERE explorer_id = ? AND learning_pack_id = ? AND discovery_id = ?;`,
      explorerId,
      learningPackId,
      discoveryId,
    );
    return row ? toPackDiscoveryProgress(row) : null;
  }

  async listCompletedPackDiscoveryIds(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
  ): Promise<DiscoveryId[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<Pick<PackDiscoveryRow, 'discovery_id'>>(
      `SELECT discovery_id FROM pack_discovery_progress
       WHERE explorer_id = ? AND learning_pack_id = ? AND completed_at IS NOT NULL;`,
      explorerId,
      learningPackId,
    );
    return rows.map((row) => row.discovery_id);
  }

  async markPackDiscoveryRevealed(write: {
    explorerId: ExplorerId;
    learningPackId: LearningPackId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const db = await this.database();
    const result = await db.runAsync(
      `INSERT INTO pack_discovery_progress
       (explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?)
       ON CONFLICT(explorer_id, learning_pack_id, discovery_id) DO UPDATE SET
         revealed_at = COALESCE(pack_discovery_progress.revealed_at, excluded.revealed_at),
         updated_at = CASE WHEN pack_discovery_progress.revealed_at IS NULL THEN excluded.updated_at ELSE pack_discovery_progress.updated_at END
       WHERE pack_discovery_progress.revealed_at IS NULL;`,
      write.explorerId,
      write.learningPackId,
      write.discoveryId,
      write.occurredAt,
      write.occurredAt,
    );
    return result.changes > 0;
  }

  async completePackDiscovery(write: {
    explorerId: ExplorerId;
    learningPackId: LearningPackId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const db = await this.database();
    const result = await db.runAsync(
      `INSERT INTO pack_discovery_progress
       (explorer_id, learning_pack_id, discovery_id, revealed_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(explorer_id, learning_pack_id, discovery_id) DO UPDATE SET
         revealed_at = COALESCE(pack_discovery_progress.revealed_at, excluded.revealed_at),
         completed_at = excluded.completed_at, updated_at = excluded.updated_at
       WHERE pack_discovery_progress.completed_at IS NULL;`,
      write.explorerId,
      write.learningPackId,
      write.discoveryId,
      write.occurredAt,
      write.occurredAt,
      write.occurredAt,
    );
    return result.changes > 0;
  }

  async getLearningPackProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
  ): Promise<LearningPackProgress | null> {
    const db = await this.database();
    const row = await db.getFirstAsync<PackRow>(
      `SELECT explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision
       FROM learning_pack_progress WHERE explorer_id = ? AND learning_pack_id = ?;`,
      explorerId,
      learningPackId,
    );
    return row ? toLearningPackProgress(row) : null;
  }

  async startOrTouchLearningPack(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    occurredAt: string,
  ): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO learning_pack_progress
       (explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?)
       ON CONFLICT(explorer_id, learning_pack_id) DO UPDATE SET
         last_viewed_at = excluded.last_viewed_at, updated_at = excluded.updated_at;`,
      explorerId,
      learningPackId,
      occurredAt,
      occurredAt,
      occurredAt,
    );
  }

  async completeLearningPack(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    completionRevision: string,
    occurredAt: string,
  ): Promise<boolean> {
    const db = await this.database();
    const result = await db.runAsync(
      `INSERT INTO learning_pack_progress
       (explorer_id, learning_pack_id, started_at, last_viewed_at, completed_at, completion_revision, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(explorer_id, learning_pack_id) DO UPDATE SET
         completed_at = excluded.completed_at, completion_revision = excluded.completion_revision,
         updated_at = excluded.updated_at
       WHERE learning_pack_progress.completed_at IS NULL;`,
      explorerId,
      learningPackId,
      occurredAt,
      occurredAt,
      occurredAt,
      completionRevision,
      occurredAt,
    );
    return result.changes > 0;
  }

  async getEarnedBadge(explorerId: ExplorerId, worldId: WorldId): Promise<EarnedBadge | null> {
    const db = await this.database();
    const row = await db.getFirstAsync<BadgeRow>(
      'SELECT explorer_id, world_id, earned_at, content_revision FROM earned_badges WHERE explorer_id = ? AND world_id = ?;',
      explorerId,
      worldId,
    );
    return row ? toBadge(row) : null;
  }

  async listEarnedBadges(explorerId: ExplorerId): Promise<EarnedBadge[]> {
    const db = await this.database();
    const rows = await db.getAllAsync<BadgeRow>(
      'SELECT explorer_id, world_id, earned_at, content_revision FROM earned_badges WHERE explorer_id = ? ORDER BY earned_at DESC;',
      explorerId,
    );
    return rows.map(toBadge);
  }

  async earnWorldBadge(
    explorerId: ExplorerId,
    worldId: WorldId,
    contentRevision: string,
    occurredAt: string,
  ): Promise<boolean> {
    const db = await this.database();
    const result = await db.runAsync(
      `INSERT INTO earned_badges (explorer_id, world_id, earned_at, content_revision)
       VALUES (?, ?, ?, ?) ON CONFLICT(explorer_id, world_id) DO NOTHING;`,
      explorerId,
      worldId,
      occurredAt,
      contentRevision,
    );
    return result.changes > 0;
  }
}
