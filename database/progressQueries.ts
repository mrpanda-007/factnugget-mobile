import { getDatabase } from '@database/client';
import type { CollectedDiscovery, DeckProgress, EarnedSticker } from '@app-types/Progress';

interface DeckProgressRow {
  deck_id: string;
  started_at: string;
  last_viewed_at: string;
  completed_at: string | null;
}

interface DiscoveryProgressRow {
  discovery_id: string;
  deck_id: string;
  completed_at: string;
}

interface StickerRow {
  sticker_id: string;
  discovery_id: string;
  earned_at: string;
}

/** Call on entering a deck's World Home / first Discovery Card — creates the row on first touch, bumps last_viewed_at on every later visit. */
export async function startOrTouchDeck(deckId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO deck_progress (deck_id, started_at, last_viewed_at, completed_at) VALUES (?, ?, ?, NULL)
     ON CONFLICT (deck_id) DO UPDATE SET last_viewed_at = excluded.last_viewed_at;`,
    deckId,
    now,
    now,
  );
}

/**
 * Whether every discovery in the deck is complete is a content-shape question
 * (deck.discoveryIds.length), which this repository/query layer never sees —
 * that comparison lives in the calling hook, which also holds ContentRepository
 * data. This just records the fact once the hook has decided.
 */
export async function markDeckCompleted(deckId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE deck_progress SET completed_at = ? WHERE deck_id = ?;`,
    new Date().toISOString(),
    deckId,
  );
}

export async function completeDiscovery(discoveryId: string, deckId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO discovery_progress (discovery_id, deck_id, completed_at) VALUES (?, ?, ?)
     ON CONFLICT (discovery_id) DO NOTHING;`,
    discoveryId,
    deckId,
    new Date().toISOString(),
  );
}

export async function earnSticker(stickerId: string, discoveryId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO stickers (sticker_id, discovery_id, earned_at) VALUES (?, ?, ?)
     ON CONFLICT (sticker_id) DO NOTHING;`,
    stickerId,
    discoveryId,
    new Date().toISOString(),
  );
}

export async function readDeckProgress(deckId: string): Promise<DeckProgress | null> {
  const db = await getDatabase();
  const deckRow = await db.getFirstAsync<DeckProgressRow>(
    'SELECT * FROM deck_progress WHERE deck_id = ?;',
    deckId,
  );
  if (!deckRow) return null;

  const discoveryRows = await db.getAllAsync<DiscoveryProgressRow>(
    'SELECT * FROM discovery_progress WHERE deck_id = ?;',
    deckId,
  );

  return {
    deckId: deckRow.deck_id,
    startedAt: deckRow.started_at,
    lastViewedAt: deckRow.last_viewed_at,
    completedAt: deckRow.completed_at,
    completedDiscoveryIds: discoveryRows.map((row) => row.discovery_id),
  };
}

/** Powers World Home's "Continue Exploring" card — the most recently touched deck that isn't finished yet. */
export async function readMostRecentlyActiveDeckId(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ deck_id: string }>(
    `SELECT deck_id FROM deck_progress
     WHERE completed_at IS NULL
     ORDER BY last_viewed_at DESC
     LIMIT 1;`,
  );
  return row?.deck_id ?? null;
}

export async function readCollectedDiscoveries(): Promise<CollectedDiscovery[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DiscoveryProgressRow>(
    'SELECT * FROM discovery_progress ORDER BY completed_at DESC;',
  );
  return rows.map((row) => ({ discoveryId: row.discovery_id, collectedAt: row.completed_at }));
}

export async function readEarnedStickers(): Promise<EarnedSticker[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<StickerRow>('SELECT * FROM stickers ORDER BY earned_at DESC;');
  return rows.map((row) => ({
    stickerId: row.sticker_id,
    discoveryId: row.discovery_id,
    earnedAt: row.earned_at,
  }));
}
