import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@database/client';
import type { CloudAccountBinding } from '@app-types/domain/cloud';
import { parseAuthUserId, parseFamilyId } from '@app-types/domain/ids';
import type {
  BindCloudAccountInput,
  CloudAccountBindingRepositoryContract,
} from '@repositories/contracts/CloudAccountBindingRepositoryContract';

interface BindingRow {
  auth_user_id: string;
  family_id: string;
  binding_state: string;
  bound_at: string;
  updated_at: string;
}

function isValidTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function toBinding(row: BindingRow | null): CloudAccountBinding {
  if (!row) return { state: 'unbound' };
  try {
    const authUserId = parseAuthUserId(row.auth_user_id);
    const familyId = parseFamilyId(row.family_id);
    if (row.binding_state !== 'bound' && row.binding_state !== 'mergeRequired') {
      return { state: 'unbound' };
    }
    if (!isValidTimestamp(row.bound_at) || !isValidTimestamp(row.updated_at)) {
      return { state: 'unbound' };
    }
    return {
      state: row.binding_state,
      authUserId,
      familyId,
      boundAt: row.bound_at,
      updatedAt: row.updated_at,
    };
  } catch {
    // A malformed persisted binding must never become an implicit cross-family context.
    return { state: 'unbound' };
  }
}

/** SQLite-only current device binding. It deliberately does not inspect Firebase Auth. */
export class SQLiteCloudAccountBindingRepository implements CloudAccountBindingRepositoryContract {
  constructor(private readonly database: () => Promise<SQLiteDatabase> = getDatabase) {}

  async getCurrentBinding(): Promise<CloudAccountBinding> {
    const db = await this.database();
    const row = await db.getFirstAsync<BindingRow>(
      `SELECT auth_user_id, family_id, binding_state, bound_at, updated_at
       FROM cloud_account_binding WHERE singleton_id = 1;`,
    );
    return toBinding(row);
  }

  async bind(input: BindCloudAccountInput): Promise<CloudAccountBinding> {
    const current = await this.getCurrentBinding();
    if (current.state !== 'unbound') {
      if (current.authUserId === input.authUserId && current.familyId === input.familyId) {
        return current;
      }
      throw new Error(
        'A different cloud account binding is already active. Detach it explicitly first.',
      );
    }

    const db = await this.database();
    await db.runAsync(
      `INSERT INTO cloud_account_binding
       (singleton_id, auth_user_id, family_id, binding_state, bound_at, updated_at)
       VALUES (1, ?, ?, 'bound', ?, ?);`,
      input.authUserId,
      input.familyId,
      input.boundAt,
      input.boundAt,
    );
    return {
      state: 'bound',
      authUserId: input.authUserId,
      familyId: input.familyId,
      boundAt: input.boundAt,
      updatedAt: input.boundAt,
    };
  }

  async detach(): Promise<void> {
    const db = await this.database();
    await db.runAsync('DELETE FROM cloud_account_binding WHERE singleton_id = 1;');
  }
}
