/**
 * Expo SQLite schema — docs/implementation/08-offline-engine.md. Applied by
 * database/client.ts, oldest-first, tracked via `PRAGMA user_version` so
 * re-running on an already-migrated device is a no-op.
 *
 * MVP scope only: identity, settings, and local progress/collections/stickers.
 * The offline *sync queue* for replaying writes to Firestore
 * (08-offline-engine.md#offline-sync-queue) is added once a Firebase project
 * exists — out of scope for this UI-focused pass.
 */
export interface Migration {
  version: number;
  statements: string[];
}

export const migrations: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS explorer_identity (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        identity_id TEXT NOT NULL,
        chosen_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        sound_enabled INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS deck_progress (
        deck_id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        last_viewed_at TEXT NOT NULL,
        completed_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS discovery_progress (
        discovery_id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL,
        completed_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS stickers (
        sticker_id TEXT PRIMARY KEY,
        discovery_id TEXT NOT NULL,
        earned_at TEXT NOT NULL
      );`,
    ],
  },
];
