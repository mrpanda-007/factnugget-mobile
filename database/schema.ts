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
  {
    version: 3,
    statements: [
      `CREATE TABLE local_entitlements (
        id TEXT PRIMARY KEY,
        subject_type TEXT NOT NULL CHECK (subject_type = 'learningPack'),
        subject_id TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('apple', 'google', 'development')),
        status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired', 'unknown')),
        granted_at TEXT NOT NULL,
        expires_at TEXT NULL,
        last_verified_at TEXT NULL,
        source_reference_hash TEXT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (subject_type, subject_id, source)
      );`,
      'CREATE INDEX local_entitlements_subject_status_idx ON local_entitlements (subject_type, subject_id, status);',
      'CREATE INDEX local_entitlements_last_verified_idx ON local_entitlements (last_verified_at);',
    ],
  },
  {
    version: 4,
    statements: [
      `CREATE TABLE cloud_account_binding (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        auth_user_id TEXT NOT NULL,
        family_id TEXT NOT NULL,
        binding_state TEXT NOT NULL CHECK (binding_state IN ('bound', 'mergeRequired')),
        bound_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      'CREATE INDEX cloud_account_binding_auth_user_idx ON cloud_account_binding (auth_user_id);',
      `CREATE TABLE sync_outbox (
        operation_id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('explorer', 'discoveryProgress', 'packDiscoveryProgress', 'learningPackProgress', 'earnedBadge')),
        entity_id TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type = 'upsert'),
        created_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        last_attempt_at TEXT NULL,
        last_error_code TEXT NULL,
        UNIQUE (family_id, entity_type, entity_id, operation_type)
      );`,
      'CREATE INDEX sync_outbox_family_delivery_idx ON sync_outbox (family_id, created_at, operation_id);',
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
