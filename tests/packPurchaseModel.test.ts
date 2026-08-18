import { describe, expect, it } from 'vitest';

import { PackPurchaseViewModel } from '../features/parent/hooks/packPurchaseModel';
import type { PurchaseResult, StoreProductLookupResult } from '../types/domain/commerce';
import type { LearningPack } from '../types/domain/content';
import {
  parseCommerceKey,
  parseContentSlug,
  parseLearningPackId,
  parsePlatformProductId,
  parseWorldId,
} from '../types/domain/ids';

const commerceKey = parseCommerceKey('space-adventures-one-time');
const spacePack: LearningPack = {
  id: parseLearningPackId('space-adventures'),
  slug: parseContentSlug('space-adventures'),
  worldId: parseWorldId('space'),
  title: 'Space Adventures',
  subtitle: 'A journey through space',
  sortOrder: 1,
  accessType: 'paid',
  commerceKey,
  completionRole: 'required',
  lifecycle: 'published',
  revision: '1',
};

const product: StoreProductLookupResult = {
  state: 'available',
  products: [
    {
      commerceKey,
      platformProductId: parsePlatformProductId('pack_space_adventures'),
      localizedPrice: 'Test-localized price',
      currencyCode: 'TEST',
      title: 'Space Adventures',
      description: null,
    },
  ],
};

function createFixture(
  options: {
    entitled?: boolean;
    lookup?: StoreProductLookupResult;
    result?: PurchaseResult;
    grantOnPurchase?: boolean;
    deferredPurchase?: Promise<PurchaseResult>;
  } = {},
) {
  let entitled = options.entitled ?? false;
  let lookups = 0;
  let purchases = 0;
  const access = {
    getLearningPackAccess: async () =>
      entitled
        ? ({
            state: 'allowed',
            decision: { state: 'accessible', reason: 'entitled', contentAvailability: 'available' },
          } as const)
        : ({ state: 'locked', decision: { state: 'locked', reason: 'not-entitled' } } as const),
  };
  const commerce = {
    resolveStoreProduct: async () => {
      lookups += 1;
      return options.lookup ?? product;
    },
    purchase: async () => {
      purchases += 1;
      const result = options.deferredPurchase
        ? await options.deferredPurchase
        : (options.result ?? { state: 'success', commerceKey });
      if (
        (result.state === 'success' || result.state === 'already-owned') &&
        options.grantOnPurchase !== false
      ) {
        entitled = true;
      }
      return result;
    },
  };
  return {
    model: new PackPurchaseViewModel(spacePack, { access, commerce }),
    get lookups() {
      return lookups;
    },
    get purchases() {
      return purchases;
    },
  };
}

describe('Phase 8F parent purchase view model', () => {
  it('shows local ownership immediately without a Store lookup', async () => {
    const fixture = createFixture({
      entitled: true,
      lookup: { state: 'unavailable', code: 'store-unavailable', retryable: true },
    });
    await fixture.model.initialize();
    expect(fixture.model.snapshot.status).toBe('owned');
    expect(fixture.lookups).toBe(0);
  });

  it('uses the exact Store-localized price only when a product is available', async () => {
    const fixture = createFixture();
    await fixture.model.initialize();
    expect(fixture.model.snapshot).toMatchObject({ status: 'available' });
    expect(fixture.model.snapshot.product?.localizedPrice).toBe('Test-localized price');
  });

  it('keeps an unowned Pack locked when a product is unavailable, with no price', async () => {
    const fixture = createFixture({ lookup: { state: 'not-found' } });
    await fixture.model.initialize();
    expect(fixture.model.snapshot).toMatchObject({ status: 'unavailable', product: null });
  });

  it('retries a retryable product lookup only when the parent asks', async () => {
    let attempts = 0;
    const model = new PackPurchaseViewModel(spacePack, {
      access: {
        getLearningPackAccess: async () => ({
          state: 'locked',
          decision: { state: 'locked', reason: 'not-entitled' },
        }),
      },
      commerce: {
        resolveStoreProduct: async () => {
          attempts += 1;
          return attempts === 1
            ? { state: 'unavailable', code: 'store-unavailable', retryable: true }
            : product;
        },
        purchase: async () => ({ state: 'cancelled' }),
      },
    });
    await model.initialize();
    expect(model.snapshot.status).toBe('unavailable');
    await model.retry();
    expect(model.snapshot.status).toBe('available');
    expect(attempts).toBe(2);
  });

  it('reports a loading state while Store metadata is pending', async () => {
    let release: ((result: StoreProductLookupResult) => void) | undefined;
    const lookup = new Promise<StoreProductLookupResult>((resolve) => {
      release = resolve;
    });
    const fixture = createFixture();
    fixture.model = new PackPurchaseViewModel(spacePack, {
      access: {
        getLearningPackAccess: async () => ({
          state: 'locked',
          decision: { state: 'locked', reason: 'not-entitled' },
        }),
      },
      commerce: {
        resolveStoreProduct: async () => lookup,
        purchase: async () => ({ state: 'cancelled' }),
      },
    });
    const loading = fixture.model.initialize();
    await Promise.resolve();
    await Promise.resolve();
    expect(fixture.model.snapshot.status).toBe('loading-product');
    release?.(product);
    await loading;
  });

  it('unlocks only after a successful purchase is reconciled into canonical access', async () => {
    const fixture = createFixture();
    await fixture.model.initialize();
    await fixture.model.purchase();
    expect(fixture.model.snapshot).toMatchObject({ status: 'owned', justPurchased: true });
  });

  it('shows recovery instead of success if access stays locked after a success result', async () => {
    const fixture = createFixture({ grantOnPurchase: false });
    await fixture.model.initialize();
    await fixture.model.purchase();
    expect(fixture.model.snapshot).toMatchObject({ status: 'failed', retryable: false });
  });

  it.each([
    ['cancelled', { state: 'cancelled' } as PurchaseResult],
    ['pending', { state: 'pending', commerceKey } as PurchaseResult],
    [
      'failed',
      {
        state: 'failed',
        message: 'Store unavailable',
        code: 'store-unavailable',
        retryable: true,
      } as PurchaseResult,
    ],
  ])('handles %s without granting access', async (expected, result) => {
    const fixture = createFixture({ result });
    await fixture.model.initialize();
    await fixture.model.purchase();
    expect(fixture.model.snapshot.status).toBe(expected);
    expect(fixture.model.snapshot.status).not.toBe('owned');
  });

  it('reconciles an already-owned result and then presents the Pack as owned', async () => {
    const fixture = createFixture({ result: { state: 'already-owned', commerceKey } });
    await fixture.model.initialize();
    await fixture.model.purchase();
    expect(fixture.model.snapshot).toMatchObject({ status: 'owned', justPurchased: false });
  });

  it('retries a retryable failed purchase only when the parent asks', async () => {
    const fixture = createFixture({
      result: {
        state: 'failed',
        message: 'Store unavailable',
        code: 'store-unavailable',
        retryable: true,
      },
    });
    const originalPurchase = fixture.model.purchase.bind(fixture.model);
    await fixture.model.initialize();
    await originalPurchase();
    expect(fixture.purchases).toBe(1);
    await fixture.model.retry();
    expect(fixture.purchases).toBe(2);
  });

  it('prevents repeated purchase presses from making concurrent requests', async () => {
    let release: ((result: PurchaseResult) => void) | undefined;
    const deferredPurchase = new Promise<PurchaseResult>((resolve) => {
      release = resolve;
    });
    const fixture = createFixture({ deferredPurchase });
    await fixture.model.initialize();
    const first = fixture.model.purchase();
    const second = fixture.model.purchase();
    expect(fixture.purchases).toBe(1);
    release?.({ state: 'cancelled' });
    await Promise.all([first, second]);
    expect(fixture.purchases).toBe(1);
  });
});
