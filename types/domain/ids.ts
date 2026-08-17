declare const domainIdBrand: unique symbol;

type BrandedString<Brand extends string> = string & {
  readonly [domainIdBrand]: Brand;
};

export type WorldId = BrandedString<'WorldId'>;
export type LearningPackId = BrandedString<'LearningPackId'>;
export type DiscoveryId = BrandedString<'DiscoveryId'>;
export type ExplorerId = BrandedString<'ExplorerId'>;
export type ContentSlug = BrandedString<'ContentSlug'>;
export type CommerceKey = BrandedString<'CommerceKey'>;
export type PlatformProductId = BrandedString<'PlatformProductId'>;
export type EntitlementId = BrandedString<'EntitlementId'>;

export const CONTENT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseContentId<Id extends string>(value: string, label: string): Id {
  if (!CONTENT_ID_PATTERN.test(value)) {
    throw new Error(
      `${label} must start with a lowercase letter and contain only lowercase letters, numbers, and single hyphen-separated segments.`,
    );
  }
  return value as Id;
}

export function parseWorldId(value: string): WorldId {
  return parseContentId<WorldId>(value, 'World ID');
}

export function parseLearningPackId(value: string): LearningPackId {
  return parseContentId<LearningPackId>(value, 'Learning Pack ID');
}

export function parseDiscoveryId(value: string): DiscoveryId {
  return parseContentId<DiscoveryId>(value, 'Discovery ID');
}

export function parseExplorerId(value: string): ExplorerId {
  if (!UUID_PATTERN.test(value)) {
    throw new Error('Explorer ID must be a UUID.');
  }
  return value as ExplorerId;
}

/**
 * Slugs are intentionally a distinct concept from domain IDs. The first
 * content release may use the same text for both, but links are allowed to
 * evolve without changing immutable identity.
 */
export function parseContentSlug(value: string): ContentSlug {
  if (value.trim().length === 0) {
    throw new Error('Content slug cannot be empty.');
  }
  return value as ContentSlug;
}

/**
 * An engineering-owned identifier for a purchasable capability. It is intentionally
 * separate from editorial IDs/slugs and from future platform product IDs.
 */
export function parseCommerceKey(value: string): CommerceKey {
  return parseContentId<CommerceKey>(value, 'Commerce key');
}

/**
 * A platform-store identifier is intentionally not constrained to CommerceKey
 * syntax: Apple and Google use different product-ID formats.
 */
export function parsePlatformProductId(value: string): PlatformProductId {
  if (value.trim().length === 0 || /\s/.test(value)) {
    throw new Error('Platform product ID must be a non-empty string without whitespace.');
  }
  return value as PlatformProductId;
}

export function parseEntitlementId(value: string): EntitlementId {
  if (!UUID_PATTERN.test(value)) {
    throw new Error('Entitlement ID must be a UUID.');
  }
  return value as EntitlementId;
}

function fillRandomBytes(bytes: Uint8Array<ArrayBuffer>): void {
  const cryptoProvider = globalThis.crypto;
  if (cryptoProvider?.getRandomValues) {
    cryptoProvider.getRandomValues(bytes);
    return;
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
}

/** Creates a local, opaque Explorer identity. It never derives from a look, device, or name. */
export function createExplorerId(): ExplorerId {
  return createOpaqueUuid(parseExplorerId);
}

/** Creates a local opaque record ID; it never contains store transaction data. */
export function createEntitlementId(): EntitlementId {
  return createOpaqueUuid(parseEntitlementId);
}

function createOpaqueUuid<Id extends string>(parse: (value: string) => Id): Id {
  const bytes = new Uint8Array(new ArrayBuffer(16));
  fillRandomBytes(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return parse(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
  );
}
