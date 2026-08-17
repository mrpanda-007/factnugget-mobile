/** SQLite schema migrations. Legacy v1 tables remain available after v2. */
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

/** v2 renames the incompatible v1 discovery table before creating its replacement. */
export const V2_SCHEMA_STATEMENTS = [
  'ALTER TABLE discovery_progress RENAME TO legacy_discovery_progress;',
  `CREATE TABLE local_explorers (
    id TEXT PRIMARY KEY,
    look_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE device_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active_explorer_id TEXT NULL,
    sound_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (active_explorer_id) REFERENCES local_explorers(id) ON DELETE SET NULL
  );`,
  `CREATE TABLE discovery_progress (
    explorer_id TEXT NOT NULL,
    discovery_id TEXT NOT NULL,
    revealed_at TEXT NULL,
    collected_at TEXT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (explorer_id, discovery_id),
    FOREIGN KEY (explorer_id) REFERENCES local_explorers(id)
  );`,
  `CREATE TABLE pack_discovery_progress (
    explorer_id TEXT NOT NULL,
    learning_pack_id TEXT NOT NULL,
    discovery_id TEXT NOT NULL,
    revealed_at TEXT NULL,
    completed_at TEXT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (explorer_id, learning_pack_id, discovery_id),
    FOREIGN KEY (explorer_id) REFERENCES local_explorers(id)
  );`,
  `CREATE TABLE learning_pack_progress (
    explorer_id TEXT NOT NULL,
    learning_pack_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    last_viewed_at TEXT NOT NULL,
    completed_at TEXT NULL,
    completion_revision TEXT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (explorer_id, learning_pack_id),
    FOREIGN KEY (explorer_id) REFERENCES local_explorers(id)
  );`,
  `CREATE TABLE earned_badges (
    explorer_id TEXT NOT NULL,
    world_id TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    content_revision TEXT NULL,
    PRIMARY KEY (explorer_id, world_id),
    FOREIGN KEY (explorer_id) REFERENCES local_explorers(id)
  );`,
  'CREATE INDEX discovery_progress_explorer_collected_idx ON discovery_progress (explorer_id, collected_at);',
  'CREATE INDEX pack_discovery_progress_explorer_pack_idx ON pack_discovery_progress (explorer_id, learning_pack_id);',
  'CREATE INDEX learning_pack_progress_explorer_last_viewed_idx ON learning_pack_progress (explorer_id, last_viewed_at DESC);',
];
