import { getDatabase } from '@database/client';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { Explorer } from '@app-types/domain/progress';
import { createExplorerId, parseExplorerId, type ExplorerId } from '@app-types/domain/ids';

interface ExplorerRow {
  id: string;
  look_id: ExplorerIdentityId;
  created_at: string;
}

interface SettingsRow {
  active_explorer_id: string | null;
  sound_enabled: number;
}

function toExplorer(row: ExplorerRow): Explorer {
  return { id: parseExplorerId(row.id), lookId: row.look_id, createdAt: row.created_at };
}

export interface ActiveExplorerState {
  explorer: Explorer | null;
  soundEnabled: boolean;
}

export class SQLiteExplorerRepository {
  constructor(private readonly database: () => Promise<SQLiteDatabase> = getDatabase) {}

  async getActiveState(): Promise<ActiveExplorerState> {
    const db = await this.database();
    const settings = await db.getFirstAsync<SettingsRow>(
      'SELECT active_explorer_id, sound_enabled FROM device_settings WHERE id = 1;',
    );
    if (!settings?.active_explorer_id) {
      return { explorer: null, soundEnabled: settings?.sound_enabled === 1 };
    }
    const row = await db.getFirstAsync<ExplorerRow>(
      'SELECT id, look_id, created_at FROM local_explorers WHERE id = ?;',
      settings.active_explorer_id,
    );
    return { explorer: row ? toExplorer(row) : null, soundEnabled: settings.sound_enabled === 1 };
  }

  async createExplorer(lookId: ExplorerIdentityId): Promise<Explorer> {
    const db = await this.database();
    const now = new Date().toISOString();
    const id = createExplorerId();
    await db.runAsync(
      'INSERT INTO local_explorers (id, look_id, created_at, updated_at) VALUES (?, ?, ?, ?);',
      id,
      lookId,
      now,
      now,
    );
    return { id, lookId, createdAt: now };
  }

  async setActiveExplorer(explorerId: ExplorerId): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO device_settings (id, active_explorer_id, sound_enabled, updated_at)
       VALUES (1, ?, 0, ?)
       ON CONFLICT(id) DO UPDATE SET active_explorer_id = excluded.active_explorer_id, updated_at = excluded.updated_at;`,
      explorerId,
      new Date().toISOString(),
    );
  }

  async updateExplorerLook(explorerId: ExplorerId, lookId: ExplorerIdentityId): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      'UPDATE local_explorers SET look_id = ?, updated_at = ? WHERE id = ?;',
      lookId,
      new Date().toISOString(),
      explorerId,
    );
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO device_settings (id, active_explorer_id, sound_enabled, updated_at)
       VALUES (1, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET sound_enabled = excluded.sound_enabled, updated_at = excluded.updated_at;`,
      enabled ? 1 : 0,
      new Date().toISOString(),
    );
  }
}
