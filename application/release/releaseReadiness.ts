import { ANDROID_FREE_V1, type LaunchPolicy, resolveLaunchPolicy } from './launchPolicy';
import { getLegalLinks, type LegalLinks } from './legalLinks';

export interface ReleaseReadiness {
  state: 'ready' | 'blocked';
  blockers: string[];
}

export interface ReleaseReadinessInput {
  policy?: LaunchPolicy;
  links?: LegalLinks;
  /** True when the build points at Firebase emulators; must never ship. */
  usesFirebaseEmulator?: boolean;
  isDevelopmentBuild?: boolean;
}

/**
 * Gate for the Play upload candidate. This is a reporting check run by tests and
 * release tooling — never a runtime assertion, because a missing marketing URL
 * must not stop a child from opening the app.
 */
export function evaluateReleaseReadiness({
  policy = resolveLaunchPolicy(false),
  links = getLegalLinks(),
  usesFirebaseEmulator = false,
  isDevelopmentBuild = false,
}: ReleaseReadinessInput = {}): ReleaseReadiness {
  const blockers: string[] = [];

  if (!links.privacyPolicy) {
    blockers.push(
      'EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL is not set to a valid https URL. Google Play requires a privacy policy for this app.',
    );
  }
  if (policy.mode !== ANDROID_FREE_V1.mode) {
    blockers.push(`Release candidate must ship launch mode "${ANDROID_FREE_V1.mode}".`);
  }
  if (policy.parentAccountsEnabled) {
    blockers.push('Parent accounts are enabled; the free Android v1 release must not expose them.');
  }
  if (policy.backupAndSyncEnabled) {
    blockers.push('Backup & Sync is enabled; the free Android v1 release must not expose it.');
  }
  if (policy.purchasesEnabled) {
    blockers.push(
      'Purchases are enabled; no product is purchasable in the free Android v1 release.',
    );
  }
  if (policy.analyticsEnabled) blockers.push('Analytics are enabled; none ships in Android v1.');
  if (policy.notificationsEnabled) {
    blockers.push('Notifications are enabled; none ships in Android v1.');
  }
  if (usesFirebaseEmulator) blockers.push('Build targets Firebase emulators.');
  if (isDevelopmentBuild) blockers.push('Build is a development build.');

  return { state: blockers.length === 0 ? 'ready' : 'blocked', blockers };
}
