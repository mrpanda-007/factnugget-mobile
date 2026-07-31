import { getDatabase } from '@database/client';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';

export async function readIdentity(): Promise<ExplorerIdentityId | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ identity_id: ExplorerIdentityId }>(
    'SELECT identity_id FROM explorer_identity WHERE id = 1;',
  );
  return row?.identity_id ?? null;
}

export async function writeIdentity(identityId: ExplorerIdentityId): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO explorer_identity (id, identity_id, chosen_at) VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET identity_id = excluded.identity_id, chosen_at = excluded.chosen_at;`,
    identityId,
    new Date().toISOString(),
  );
}

/** Brief's Sound Design spec: "Default: Muted. Allow: sound toggle." — false until a row exists. */
export async function readSoundEnabled(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ sound_enabled: number }>(
    'SELECT sound_enabled FROM settings WHERE id = 1;',
  );
  return row ? row.sound_enabled === 1 : false;
}

export async function writeSoundEnabled(enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (id, sound_enabled) VALUES (1, ?)
     ON CONFLICT (id) DO UPDATE SET sound_enabled = excluded.sound_enabled;`,
    enabled ? 1 : 0,
  );
}
