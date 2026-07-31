/**
 * Local progress models — persisted in Expo SQLite per
 * docs/implementation/08-offline-engine.md, read/written through
 * repositories/ProgressRepository.ts. These mirror the eventual Firestore
 * shape (docs/implementation/03-firebase.md#firestore-data-model) closely on
 * purpose, so wiring real sync later doesn't change these shapes.
 */

export interface DeckProgress {
  deckId: string;
  startedAt: string;
  lastViewedAt: string;
  completedAt: string | null;
  completedDiscoveryIds: string[];
}

export interface CollectedDiscovery {
  discoveryId: string;
  collectedAt: string;
}

export interface EarnedSticker {
  stickerId: string;
  discoveryId: string;
  earnedAt: string;
}
