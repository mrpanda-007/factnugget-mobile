import * as identityQueries from '@database/identityQueries';
import * as progressQueries from '@database/progressQueries';
import type { Discovery } from '@app-types/Discovery';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { CollectedDiscovery, DeckProgress, EarnedSticker } from '@app-types/Progress';

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
  return identityQueries.readIdentity();
}

export function setIdentity(identityId: ExplorerIdentityId): Promise<void> {
  return identityQueries.writeIdentity(identityId);
}

export function getSoundEnabled(): Promise<boolean> {
  return identityQueries.readSoundEnabled();
}

export function setSoundEnabled(enabled: boolean): Promise<void> {
  return identityQueries.writeSoundEnabled(enabled);
}

export function startOrTouchDeck(deckId: string): Promise<void> {
  return progressQueries.startOrTouchDeck(deckId);
}

/** Caller (a hook holding the deck's full discoveryIds from ContentRepository) decides when a deck is complete — see database/progressQueries.ts#markDeckCompleted. */
export function markDeckCompleted(deckId: string): Promise<void> {
  return progressQueries.markDeckCompleted(deckId);
}

export function getDeckProgress(deckId: string): Promise<DeckProgress | null> {
  return progressQueries.readDeckProgress(deckId);
}

export function getMostRecentlyActiveDeckId(): Promise<string | null> {
  return progressQueries.readMostRecentlyActiveDeckId();
}

export async function completeDiscovery(discovery: Discovery): Promise<void> {
  await progressQueries.completeDiscovery(discovery.id, discovery.deck);
  await progressQueries.earnSticker(`${discovery.id}-sticker`, discovery.id);
}

export function getCollection(): Promise<CollectedDiscovery[]> {
  return progressQueries.readCollectedDiscoveries();
}

export function getEarnedStickers(): Promise<EarnedSticker[]> {
  return progressQueries.readEarnedStickers();
}
