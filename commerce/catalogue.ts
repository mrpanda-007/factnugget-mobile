import {
  parseCommerceKey,
  parseLearningPackId,
  parsePlatformProductId,
  type CommerceKey,
  type LearningPackId,
  type PlatformProductId,
} from '@app-types/domain/ids';

/**
 * Store product IDs are engineering-owned. They are planned / unverified until
 * registered in App Store Connect and Google Play Console; prices arrive from
 * the Store provider in a later phase.
 */
export type CommercePlatform = 'ios' | 'android';

export interface CommerceProductConfig {
  productId: PlatformProductId;
}

/** One-time, non-consumable Learning Pack access only; never a subscription. */
export interface CommerceCatalogueEntry {
  commerceKey: CommerceKey;
  ios: CommerceProductConfig;
  android: CommerceProductConfig;
}

const commerceCatalogueEntries: readonly CommerceCatalogueEntry[] = [
  {
    commerceKey: parseCommerceKey('space-adventures-one-time'),
    ios: { productId: parsePlatformProductId('com.factnuggets.pack.space_adventures') },
    android: { productId: parsePlatformProductId('pack_space_adventures') },
  },
];

const commerceKeysByLearningPackId: Readonly<Record<string, CommerceKey>> = {
  'space-adventures': commerceCatalogueEntries[0].commerceKey,
};

function isCommercePlatform(platform: string): platform is CommercePlatform {
  return platform === 'ios' || platform === 'android';
}

/** Validates the tiny static catalogue at module initialization and in tests. */
export function validateCommerceCatalogue(
  entries: readonly CommerceCatalogueEntry[] = commerceCatalogueEntries,
): void {
  const commerceKeys = new Set<string>();
  const productIds = new Set<string>();
  for (const entry of entries) {
    if (commerceKeys.has(entry.commerceKey)) {
      throw new Error(`Duplicate CommerceKey in catalogue: ${entry.commerceKey}`);
    }
    commerceKeys.add(entry.commerceKey);

    for (const platform of ['ios', 'android'] as const) {
      const productId = entry[platform]?.productId;
      if (!productId) {
        throw new Error(
          `Missing ${platform} product mapping for CommerceKey: ${entry.commerceKey}`,
        );
      }
      if (productIds.has(productId)) {
        throw new Error(`Duplicate platform product ID in catalogue: ${productId}`);
      }
      productIds.add(productId);
    }
  }
}

validateCommerceCatalogue();

export function getCommerceProductConfig(
  commerceKey: CommerceKey,
): CommerceCatalogueEntry | undefined {
  return commerceCatalogueEntries.find((entry) => entry.commerceKey === commerceKey);
}

export function hasCommerceMapping(commerceKey: CommerceKey): boolean {
  return getCommerceProductConfig(commerceKey) !== undefined;
}

export function listConfiguredCommerceKeys(): readonly CommerceKey[] {
  return commerceCatalogueEntries.map((entry) => entry.commerceKey);
}

/** Fails closed: unsupported platforms and unmapped products never receive a fallback ID. */
export function getPlatformProductId(
  commerceKey: CommerceKey,
  platform: string,
): PlatformProductId {
  if (!isCommercePlatform(platform)) {
    throw new Error(`Unsupported commerce platform: ${platform}`);
  }
  const entry = getCommerceProductConfig(commerceKey);
  if (!entry) {
    throw new Error(`No commerce product mapping configured for CommerceKey: ${commerceKey}`);
  }
  return entry[platform].productId;
}

/** Reverse lookup is infrastructure-only, for translating native Store events. */
export function getCommerceKeyForPlatformProductId(
  platform: string,
  productId: string,
): CommerceKey | undefined {
  if (!isCommercePlatform(platform)) return undefined;
  return commerceCatalogueEntries.find((entry) => entry[platform].productId === productId)
    ?.commerceKey;
}

export function getCommerceKeyForLearningPack(
  learningPackId: LearningPackId,
): CommerceKey | undefined {
  return commerceKeysByLearningPackId[learningPackId];
}

export function getLearningPackIdForCommerceKey(
  commerceKey: CommerceKey,
): LearningPackId | undefined {
  const entry = Object.entries(commerceKeysByLearningPackId).find(
    ([, candidate]) => candidate === commerceKey,
  );
  return entry ? parseLearningPackId(entry[0]) : undefined;
}
