import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ANDROID_FREE_V1,
  isBackupAndSyncEnabled,
  areParentAccountsEnabled,
  resolveLaunchPolicy,
  resolvePaidPackLaunchMode,
  shouldShowPaidPurchaseControls,
} from '../application/release/launchPolicy';

const parentArea = readFileSync(
  join(__dirname, '../features/parent/screens/ParentAreaScreen.tsx'),
  'utf8',
);

describe('Android free v1 launch policy', () => {
  it('ships every optional launch surface disabled in a release build', () => {
    const policy = resolveLaunchPolicy(false);

    expect(policy.mode).toBe('android-free-v1');
    expect(policy.backupAndSyncEnabled).toBe(false);
    expect(policy.parentAccountsEnabled).toBe(false);
    expect(policy.purchasesEnabled).toBe(false);
    expect(policy.notificationsEnabled).toBe(false);
    expect(policy.analyticsEnabled).toBe(false);
    expect(policy).toEqual(ANDROID_FREE_V1);
  });

  it('cannot be widened by EXPO_PUBLIC_* values a repackaged build could edit', () => {
    const previous = { ...process.env };
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_BACKUP_AND_SYNC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_PARENT_ACCOUNTS_ENABLED = 'true';
    process.env.EXPO_PUBLIC_PURCHASES_ENABLED = 'true';

    try {
      expect(resolveLaunchPolicy(false)).toEqual(ANDROID_FREE_V1);
      expect(isBackupAndSyncEnabled(resolveLaunchPolicy(false))).toBe(false);
      expect(areParentAccountsEnabled(resolveLaunchPolicy(false))).toBe(false);
    } finally {
      process.env = previous;
    }
  });

  it('keeps the Phase 8/9 harnesses reachable in development', () => {
    const policy = resolveLaunchPolicy(true);

    expect(policy.mode).toBe('development');
    expect(policy.backupAndSyncEnabled).toBe(true);
    expect(policy.parentAccountsEnabled).toBe(true);
    expect(policy.purchasesEnabled).toBe(true);
  });

  it('never enables analytics or notifications, in any mode', () => {
    for (const policy of [resolveLaunchPolicy(true), resolveLaunchPolicy(false)]) {
      expect(policy.analyticsEnabled).toBe(false);
      expect(policy.notificationsEnabled).toBe(false);
    }
  });

  it('keeps production free-first and hides Store purchase controls', () => {
    const mode = resolvePaidPackLaunchMode(false);
    expect(mode).toBe('free-first');
    expect(shouldShowPaidPurchaseControls(mode)).toBe(false);
  });

  it('retains commerce validation controls in development builds', () => {
    const mode = resolvePaidPackLaunchMode(true);
    expect(mode).toBe('development-commerce');
    expect(shouldShowPaidPurchaseControls(mode)).toBe(true);
  });
});

describe('Parent Area launch gating', () => {
  it('renders Backup & Sync only behind the launch policy', () => {
    expect(parentArea).toContain('{isBackupAndSyncEnabled() ? <BackupAndSyncSection /> : null}');
    expect(parentArea).not.toMatch(/^\s*<BackupAndSyncSection \/>\s*$/m);
  });

  it('renders Restore Purchases only behind the launch policy', () => {
    expect(parentArea).toContain(
      '{shouldShowPaidPurchaseControls() ? <RestorePurchasesSection onRestored={refresh} /> : null}',
    );
  });
});
