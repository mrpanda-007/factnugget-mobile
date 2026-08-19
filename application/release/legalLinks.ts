export type LegalLinkKey = 'privacyPolicy' | 'terms' | 'support';

export interface LegalLinks {
  privacyPolicy: string | null;
  terms: string | null;
  support: string | null;
}

/**
 * Schemes we are willing to hand to the OS. Anything else — most importantly
 * `javascript:` and app-custom schemes — is treated as unconfigured, so a bad
 * or hostile value degrades to a hidden row rather than an external navigation.
 */
const WEB_SCHEMES = ['https:', 'http:'];
const SUPPORT_SCHEMES = [...WEB_SCHEMES, 'mailto:'];

function normalise(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** A link is only usable when it parses and uses a scheme we allow. */
export function sanitiseLegalUrl(
  value: string | undefined,
  allowedSchemes: readonly string[] = WEB_SCHEMES,
): string | null {
  const candidate = normalise(value);
  if (!candidate) return null;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (!allowedSchemes.includes(parsed.protocol)) return null;
  // A bare scheme such as "https://" parses but addresses nothing.
  if (parsed.protocol !== 'mailto:' && !parsed.hostname) return null;
  if (parsed.protocol === 'mailto:' && !parsed.pathname.includes('@')) return null;
  return candidate;
}

/**
 * Each value must be written as a literal `process.env.EXPO_PUBLIC_*` member
 * expression: babel-preset-expo substitutes those statically at bundle time,
 * and there is no populated `process.env` on device to read at runtime. Reading
 * these through a dynamic key (`env[name]`) silently yields undefined in a
 * release build, so keep the literal form even though it looks repetitive.
 */
const BUNDLED_ENV: Record<string, string | undefined> = {
  EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL,
  EXPO_PUBLIC_LEGAL_TERMS_URL: process.env.EXPO_PUBLIC_LEGAL_TERMS_URL,
  EXPO_PUBLIC_LEGAL_SUPPORT_URL: process.env.EXPO_PUBLIC_LEGAL_SUPPORT_URL,
};

/**
 * These URLs are public by definition and carry no secret, so EXPO_PUBLIC_*
 * is the correct home for them.
 */
export function getLegalLinks(
  environment: Record<string, string | undefined> = BUNDLED_ENV,
): LegalLinks {
  return {
    privacyPolicy: sanitiseLegalUrl(environment.EXPO_PUBLIC_LEGAL_PRIVACY_POLICY_URL),
    terms: sanitiseLegalUrl(environment.EXPO_PUBLIC_LEGAL_TERMS_URL),
    support: sanitiseLegalUrl(environment.EXPO_PUBLIC_LEGAL_SUPPORT_URL, SUPPORT_SCHEMES),
  };
}

export function hasAnyLegalLink(links: LegalLinks): boolean {
  return Boolean(links.privacyPolicy || links.terms || links.support);
}
