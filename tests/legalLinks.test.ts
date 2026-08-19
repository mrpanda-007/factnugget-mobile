import { describe, expect, it } from 'vitest';

import {
  getLegalLinks,
  hasAnyLegalLink,
  sanitiseLegalUrl,
} from '../application/release/legalLinks';
import { evaluateReleaseReadiness } from '../application/release/releaseReadiness';

const PRIVACY = 'https://factnuggets.example/privacy';

describe('legal link configuration', () => {
  it('exposes configured https links', () => {
    const links = getLegalLinks({
      EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL: PRIVACY,
      EXPO_PUBLIC_LEGAL_TERMS_URL: 'https://factnuggets.example/terms',
      EXPO_PUBLIC_LEGAL_SUPPORT_URL: 'https://factnuggets.example/support',
    });

    expect(links.privacyPolicy).toBe(PRIVACY);
    expect(links.terms).toBe('https://factnuggets.example/terms');
    expect(links.support).toBe('https://factnuggets.example/support');
    expect(hasAnyLegalLink(links)).toBe(true);
  });

  it('treats unset values as absent so no dead row renders', () => {
    const links = getLegalLinks({});

    expect(links).toEqual({ privacyPolicy: null, terms: null, support: null });
    expect(hasAnyLegalLink(links)).toBe(false);
  });

  it('treats blank and whitespace values as absent', () => {
    expect(getLegalLinks({ EXPO_PUBLIC_LEGAL_TERMS_URL: '   ' }).terms).toBeNull();
  });

  it('rejects malformed and unsafe URLs rather than opening them', () => {
    for (const value of [
      'not-a-url',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'factnuggets://parent/account',
      'https://',
    ]) {
      expect(sanitiseLegalUrl(value)).toBeNull();
    }
  });

  it('allows mailto only for support, never for privacy or terms', () => {
    const links = getLegalLinks({
      EXPO_PUBLIC_LEGAL_SUPPORT_URL: 'mailto:hello@factnuggets.example',
      EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL: 'mailto:hello@factnuggets.example',
    });

    expect(links.support).toBe('mailto:hello@factnuggets.example');
    expect(links.privacyPolicy).toBeNull();
  });
});

describe('release readiness', () => {
  it('blocks a Play candidate that has no privacy policy URL', () => {
    const result = evaluateReleaseReadiness({ links: getLegalLinks({}) });

    expect(result.state).toBe('blocked');
    expect(result.blockers.join(' ')).toContain('EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL');
  });

  it('is ready once the privacy policy is configured and the free policy holds', () => {
    const result = evaluateReleaseReadiness({
      links: getLegalLinks({ EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL: PRIVACY }),
    });

    expect(result).toEqual({ state: 'ready', blockers: [] });
  });

  it('blocks a candidate that re-enables accounts, backup, purchases, or the emulator', () => {
    const result = evaluateReleaseReadiness({
      links: getLegalLinks({ EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL: PRIVACY }),
      policy: {
        mode: 'development',
        backupAndSyncEnabled: true,
        parentAccountsEnabled: true,
        purchasesEnabled: true,
        notificationsEnabled: true,
        analyticsEnabled: true,
      },
      usesFirebaseEmulator: true,
      isDevelopmentBuild: true,
    });

    expect(result.state).toBe('blocked');
    expect(result.blockers).toHaveLength(8);
  });
});
