import { getSQLiteProgressRepository } from '../application/discoveryProgressRuntime';
import * as ExplorerRepository from '@repositories/ExplorerRepository';
import { getDatabase } from '@database/client';
import type { Discovery } from '@app-types/Discovery';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { CollectedDiscovery, DeckProgress, EarnedSticker } from '@app-types/Progress';
import { parseDiscoveryId, parseLearningPackId, parseWorldId } from '@app-types/domain/ids';

/**
 * The only module screens/hooks call for identity, settings, and local
 * progress — never database/ query modules directly
 * (docs/implementation/01-project-architecture.md#repositories-layer).
 *
 * Firestore sync for this data is a future addition (docs/implementation/08-offline-engine.md#offline-sync-queue,
 * via SyncService) — no Firebase project exists yet, so every method here is
 * SQLite-only for now. Adding sync later means these methods also enqueue a
 * SyncService write; callers do not change.
 */

export function getIdentity(): Promise<ExplorerIdentityId | null> {
  return ExplorerRepository.getActiveExplorerState().then(
    ({ explorer }) => explorer?.lookId ?? null,
  );
}

export function setIdentity(identityId: ExplorerIdentityId): Promise<void> {
  return ExplorerRepository.createOrUpdateActiveExplorer(identityId).then(() => undefined);
}

export function getSoundEnabled(): Promise<boolean> {
  return ExplorerRepository.getActiveExplorerState().then(({ soundEnabled }) => soundEnabled);
}

export function setSoundEnabled(enabled: boolean): Promise<void> {
  return ExplorerRepository.setSoundEnabled(enabled);
}

async function activeExplorerId() {
  const { explorer } = await ExplorerRepository.getActiveExplorerState();
  if (!explorer) throw new Error('No active Explorer is available for progress access.');
  return explorer.id;
}

export function startOrTouchDeck(deckId: string): Promise<void> {
  return activeExplorerId().then((explorerId) =>
    getSQLiteProgressRepository().startOrTouchLearningPack(
      explorerId,
      parseLearningPackId(deckId),
      new Date().toISOString(),
    ),
  );
}

/** Caller (a hook holding the deck's full discoveryIds from ContentRepository) decides when a deck is complete — see database/progressQueries.ts#markDeckCompleted. */
export function markDeckCompleted(deckId: string): Promise<boolean> {
  return activeExplorerId().then((explorerId) =>
    getSQLiteProgressRepository().completeLearningPack(
      explorerId,
      parseLearningPackId(deckId),
      '',
      new Date().toISOString(),
    ),
  );
}

export async function getDeckProgress(deckId: string): Promise<DeckProgress | null> {
  const explorerId = await activeExplorerId();
  const learningPackId = parseLearningPackId(deckId);
  const repository = getSQLiteProgressRepository();
  const progress = await repository.getLearningPackProgress(explorerId, learningPackId);
  if (!progress) return null;
  return {
    deckId,
    startedAt: progress.startedAt,
    lastViewedAt: progress.lastViewedAt,
    completedAt: progress.completedAt,
    completedDiscoveryIds: await repository.listCompletedPackDiscoveryIds(
      explorerId,
      learningPackId,
    ),
  };
}

export async function getMostRecentlyActiveDeckId(): Promise<string | null> {
  const db = await getDatabase();
  const explorerId = await activeExplorerId();
  const row = await db.getFirstAsync<{ learning_pack_id: string }>(
    `SELECT learning_pack_id FROM learning_pack_progress
     WHERE explorer_id = ? AND completed_at IS NULL ORDER BY last_viewed_at DESC LIMIT 1;`,
    explorerId,
  );
  return row?.learning_pack_id ?? null;
}

export async function completeDiscovery(discovery: Discovery): Promise<void> {
  const explorerId = await activeExplorerId();
  await getSQLiteProgressRepository().collectDiscovery({
    explorerId,
    discoveryId: parseDiscoveryId(discovery.id),
    occurredAt: new Date().toISOString(),
  });
}

export async function getCollection(): Promise<CollectedDiscovery[]> {
  const explorerId = await activeExplorerId();
  return getSQLiteProgressRepository().listCollectedDiscoveries(explorerId);
}

export function getEarnedStickers(): Promise<EarnedSticker[]> {
  return getDatabase().then((db) =>
    db
      .getAllAsync<{ sticker_id: string; discovery_id: string; earned_at: string }>(
        'SELECT sticker_id, discovery_id, earned_at FROM stickers ORDER BY earned_at DESC;',
      )
      .then((rows) =>
        rows.map((row) => ({
          stickerId: row.sticker_id,
          discoveryId: row.discovery_id,
          earnedAt: row.earned_at,
        })),
      ),
  );
}

export async function getWorldBadge(worldId: string) {
  const explorerId = await activeExplorerId();
  return getSQLiteProgressRepository().getEarnedBadge(explorerId, parseWorldId(worldId));
}

export async function getEarnedBadges() {
  const explorerId = await activeExplorerId();
  return getSQLiteProgressRepository().listEarnedBadges(explorerId);
}
