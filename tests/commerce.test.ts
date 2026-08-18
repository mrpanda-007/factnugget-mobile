import { describe, expect, it } from 'vitest';

import { decideLearningPackAccess } from '../application/commerce/accessDecision';
import {
  CommerceService,
  getCommerceKeyForPaidLearningPack,
} from '../application/commerce/CommerceService';
import { LearningPackAccessService } from '../application/commerce/LearningPackAccessService';
import {
  getCommerceProductConfig,
  getPlatformProductId,
  hasCommerceMapping,
  listConfiguredCommerceKeys,
  validateCommerceCatalogue,
} from '../commerce/catalogue';
import type { Entitlement, PurchaseResult } from '../types/domain/commerce';
import type { LearningPack } from '../types/domain/content';
import {
  createEntitlementId,
  parseCommerceKey,
  parseContentSlug,
  parseLearningPackId,
  parseWorldId,
} from '../types/domain/ids';
import type { ContentRepositoryContract } from '../repositories/contracts/ContentRepositoryContract';
import type { EntitlementRepositoryContract } from '../repositories/contracts/EntitlementRepositoryContract';
import type { PurchaseProviderContract } from '../repositories/contracts/PurchaseProviderContract';

const now = '2026-08-17T00:00:00.000Z';
const oceanPack = makePack('ocean-secrets', 'free');
const spacePack = makePack('space-adventures', 'paid');

function makePack(id: string, accessType: LearningPack['accessType']): LearningPack {
  return {
    id: parseLearningPackId(id),
    slug: parseContentSlug(id),
    worldId: parseWorldId(id === 'space-adventures' ? 'space' : 'ocean'),
    title: id,
    subtitle: id,
    sortOrder: 1,
    accessType,
    commerceKey: accessType === 'paid' ? parseCommerceKey('space-adventures-one-time') : undefined,
    completionRole: 'required',
    lifecycle: 'published',
    revision: '1',
  };
}

function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: createEntitlementId(),
    subject: { type: 'learningPack', id: spacePack.id },
    source: 'apple',
    status: 'active',
    grantedAt: now,
    expiresAt: null,
    lastVerifiedAt: now,
    sourceReferenceHash: null,
    updatedAt: now,
    ...overrides,
  };
}

class InMemoryEntitlements implements EntitlementRepositoryContract {
  constructor(private values: Entitlement[] = []) {}

  async getLearningPackAccess(pack: LearningPack) {
    return decideLearningPackAccess(pack, await this.getEntitlementsForLearningPack(pack.id), {
      allowedSources: ['apple', 'google', 'development'],
      now: () => now,
    });
  }
  async listEntitlements() {
    return this.values;
  }
  async getEntitlementsForLearningPack(packId: LearningPack['id']) {
    return this.values.filter((value) => value.subject.id === packId);
  }
  async upsertEntitlement(value: Entitlement) {
    this.values = [...this.values.filter((item) => item.source !== value.source), value];
    return value;
  }
}

describe('Phase 8 commerce foundation', () => {
  it('validates engineering commerce keys separately from content IDs', () => {
    expect(parseCommerceKey('space-adventures-one-time')).toBe('space-adventures-one-time');
    expect(() => parseCommerceKey('Space Adventures')).toThrow('Commerce key');
  });

  it('makes free Packs accessible without an entitlement', () => {
    expect(
      decideLearningPackAccess(oceanPack, [], {
        allowedSources: ['apple', 'google'],
        now: () => now,
      }),
    ).toMatchObject({ state: 'accessible', reason: 'free' });
  });

  it('bypasses commerce for free Packs and fails clearly for a paid Pack missing its key', () => {
    expect(getCommerceKeyForPaidLearningPack(oceanPack)).toBeUndefined();
    expect(() =>
      getCommerceKeyForPaidLearningPack({ ...spacePack, commerceKey: undefined }),
    ).toThrow('Paid Learning Pack is missing a CommerceKey');
  });

  it('maps Space to planned iOS and Android product IDs without putting them on content', () => {
    const commerceKey = parseCommerceKey('space-adventures-one-time');
    expect(getPlatformProductId(commerceKey, 'ios')).toBe('com.factnuggets.pack.space_adventures');
    expect(getPlatformProductId(commerceKey, 'android')).toBe('pack_space_adventures');
    expect(getCommerceProductConfig(commerceKey)?.commerceKey).toBe(commerceKey);
    expect(hasCommerceMapping(commerceKey)).toBe(true);
    expect(listConfiguredCommerceKeys()).toEqual([commerceKey]);
    expect(spacePack).not.toHaveProperty('platformProductId');
  });

  it('fails closed for missing mappings and unsupported platforms', () => {
    expect(() => getPlatformProductId(parseCommerceKey('missing-pack-one-time'), 'ios')).toThrow(
      'No commerce product mapping',
    );
    expect(() =>
      getPlatformProductId(parseCommerceKey('space-adventures-one-time'), 'web'),
    ).toThrow('Unsupported commerce platform');
  });

  it('validates duplicate catalogue configuration before a provider can use it', () => {
    const commerceKey = parseCommerceKey('space-adventures-one-time');
    const entry = getCommerceProductConfig(commerceKey)!;
    expect(() => validateCommerceCatalogue([entry, entry])).toThrow('Duplicate CommerceKey');
  });

  it('locks paid Packs without an active entitlement, then grants active access', () => {
    const policy = { allowedSources: ['apple', 'google'] as const, now: () => now };
    expect(decideLearningPackAccess(spacePack, [], policy)).toMatchObject({
      state: 'locked',
      reason: 'not-entitled',
    });
    expect(decideLearningPackAccess(spacePack, [entitlement()], policy)).toMatchObject({
      state: 'accessible',
      reason: 'entitled',
    });
  });

  it('locks revoked and expired cached entitlements without altering progress', () => {
    const policy = { allowedSources: ['apple', 'google'] as const, now: () => now };
    expect(
      decideLearningPackAccess(spacePack, [entitlement({ status: 'revoked' })], policy),
    ).toMatchObject({ state: 'locked', reason: 'revoked' });
    expect(
      decideLearningPackAccess(
        spacePack,
        [entitlement({ expiresAt: '2026-08-16T00:00:00.000Z' })],
        policy,
      ),
    ).toMatchObject({ state: 'locked', reason: 'expired' });
  });

  it('does not allow a development grant in production access policy', () => {
    const developmentGrant = entitlement({ source: 'development' });
    expect(
      decideLearningPackAccess(spacePack, [developmentGrant], {
        allowedSources: ['apple', 'google'],
        now: () => now,
      }),
    ).toMatchObject({ state: 'locked', reason: 'not-entitled' });
  });

  it('guards direct Pack entry through the canonical access service', async () => {
    const content: Pick<ContentRepositoryContract, 'getLearningPack'> = {
      getLearningPack: async (id) => (id === spacePack.id ? spacePack : null),
    };
    const locked = new LearningPackAccessService(
      content as ContentRepositoryContract,
      new InMemoryEntitlements(),
    );
    expect(await locked.getLearningPackAccess(spacePack.id)).toMatchObject({ state: 'locked' });

    const allowed = new LearningPackAccessService(
      content as ContentRepositoryContract,
      new InMemoryEntitlements([entitlement()]),
    );
    expect(await allowed.getLearningPackAccess(spacePack.id)).toMatchObject({ state: 'allowed' });
  });

  it('keeps purchase outcomes discriminated and reconciles only successful ownership', async () => {
    const entitlements = new InMemoryEntitlements();
    const provider: PurchaseProviderContract = {
      loadStoreProducts: async () => ({ state: 'not-found' }),
      purchase: async (): Promise<PurchaseResult> => ({
        state: 'cancelled',
      }),
      restorePurchases: async () => [],
      reconcileOwnedPurchases: async () => [],
      finishReconciledPurchases: async () => {},
    };
    const commerce = new CommerceService(
      provider,
      entitlements,
      (commerceKey) => (commerceKey === 'space-adventures-one-time' ? spacePack.id : undefined),
      () => now,
    );
    expect(await commerce.purchase(spacePack.commerceKey!)).toEqual({ state: 'cancelled' });
    expect(await entitlements.listEntitlements()).toEqual([]);
  });
});
