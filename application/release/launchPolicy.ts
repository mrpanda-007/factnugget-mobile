export type PaidPackLaunchMode = 'development-commerce' | 'free-first';

/** The single named product mode the first public Android binary ships as. */
export type LaunchMode = 'android-free-v1' | 'development';

/**
 * The launch surfaces a build is allowed to expose. Every optional product
 * feature is opt-in: a flag that is absent, unknown, or misconfigured stays
 * off, so a release can never widen its own surface by accident.
 */
export interface LaunchPolicy {
  mode: LaunchMode;
  backupAndSyncEnabled: boolean;
  parentAccountsEnabled: boolean;
  purchasesEnabled: boolean;
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
}

/**
 * Android v1 ships free and local-first: no cloud account, no purchase, no
 * telemetry. Firebase, Auth and commerce implementations all remain in the
 * binary — this policy governs reachability, never the presence of code.
 */
export const ANDROID_FREE_V1: LaunchPolicy = {
  mode: 'android-free-v1',
  backupAndSyncEnabled: false,
  parentAccountsEnabled: false,
  purchasesEnabled: false,
  notificationsEnabled: false,
  analyticsEnabled: false,
};

/** Development keeps the Phase 8/9 harnesses reachable for local validation. */
export const DEVELOPMENT_LAUNCH_POLICY: LaunchPolicy = {
  mode: 'development',
  backupAndSyncEnabled: true,
  parentAccountsEnabled: true,
  purchasesEnabled: true,
  notificationsEnabled: false,
  analyticsEnabled: false,
};

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Resolves the active policy. A release binary always resolves ANDROID_FREE_V1
 * and deliberately consults no environment value: EXPO_PUBLIC_* variables are
 * bundled into the client and editable by anyone repackaging the app, so they
 * must never be able to switch a shipped feature back on.
 */
export function resolveLaunchPolicy(isDevelopment = isDevelopmentBuild()): LaunchPolicy {
  return isDevelopment ? DEVELOPMENT_LAUNCH_POLICY : ANDROID_FREE_V1;
}

export function isBackupAndSyncEnabled(policy: LaunchPolicy = resolveLaunchPolicy()): boolean {
  return policy.backupAndSyncEnabled;
}

export function areParentAccountsEnabled(policy: LaunchPolicy = resolveLaunchPolicy()): boolean {
  return policy.parentAccountsEnabled;
}

export function resolvePaidPackLaunchMode(
  isDevelopment = isDevelopmentBuild(),
): PaidPackLaunchMode {
  return isDevelopment ? 'development-commerce' : 'free-first';
}

export function shouldShowPaidPurchaseControls(
  mode: PaidPackLaunchMode = resolvePaidPackLaunchMode(),
): boolean {
  return mode === 'development-commerce';
}
