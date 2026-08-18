import { describe, expect, it } from 'vitest';

import { decideLearningPackAccess } from '../application/commerce/accessDecision';
import { CommerceService } from '../application/commerce/CommerceService';
import {
  ExpoIAPPurchaseProvider,
  normalizeExpoIapError,
  type ExpoIapClient,
  type ExpoIapPurchase,
} from '../repositories/adapters/ExpoIAPPurchaseProvider';
import type { Entitlement } from '../types/domain/commerce';
import type { LearningPack } from '../types/domain/content';
import {
  createEntitlementId,
  parseCommerceKey,
  parseContentSlug,
  parseLearningPackId,
  parseWorldId,
} from '../types/domain/ids';
import type { EntitlementRepositoryContract } from '../repositories/contracts/EntitlementRepositoryContract';

const commerceKey = parseCommerceKey('space-adventures-one-time');
const now = '2026-08-17T00:00:00.000Z';
const spacePack: LearningPack = {
  id: parseLearningPackId('space-adventures'),
  slug: parseContentSlug('space-adventures'),
  worldId: parseWorldId('space'),
  title: 'Space',
  subtitle: 'Space',
  sortOrder: 1,
  accessType: 'paid',
  commerceKey,
  completionRole: 'required',
  lifecycle: 'published',
  revision: '1',
};

class FakeExpoIapClient implements ExpoIapClient {
  products = [] as Awaited<ReturnType<ExpoIapClient['fetchProducts']>>;
  available: ExpoIapPurchase[] = [];
  requested: unknown[] = [];
  finished: ExpoIapPurchase[] = [];
  initError: unknown;
  onRequest: ((request: unknown) => void) | undefined;
  private updateListener: ((purchase: ExpoIapPurchase) => void) | undefined;
  private errorListener: ((error: unknown) => void) | undefined;

  async initConnection() {
    if (this.initError) throw this.initError;
    return true;
  }
  async endConnection() {
    return true;
  }
  async fetchProducts() {
    return this.products;
  }
  async requestPurchase(request: unknown) {
    this.requested.push(request);
    this.onRequest?.(request);
  }
  async getAvailablePurchases() {
    return this.available;
  }
  async finishTransaction({ purchase }: { purchase: ExpoIapPurchase; isConsumable: false }) {
    this.finished.push(purchase);
  }
  purchaseUpdatedListener(listener: (purchase: ExpoIapPurchase) => void) {
    this.updateListener = listener;
    return { remove: () => undefined };
  }
  purchaseErrorListener(listener: (error: unknown) => void) {
    this.errorListener = listener;
    return { remove: () => undefined };
  }
  emitPurchase(purchase: ExpoIapPurchase) {
    this.updateListener?.(purchase);
  }
  emitError(error: unknown) {
    this.errorListener?.(error);
  }
}

class InMemoryEntitlements implements EntitlementRepositoryContract {
  values: Entitlement[] = [];
  async getLearningPackAccess(pack: LearningPack) {
    return decideLearningPackAccess(pack, this.values, {
      allowedSources: ['apple', 'google'],
      now: () => now,
    });
  }
  async listEntitlements() {
    return this.values;
  }
  async getEntitlementsForLearningPack(packId: LearningPack['id']) {
    return this.values.filter((value) => value.subject.id === packId);
  }
  async upsertEntitlement(entitlement: Entitlement) {
    this.values = [
      ...this.values.filter((value) => value.source !== entitlement.source),
      { ...entitlement, id: entitlement.id || createEntitlementId() },
    ];
    return entitlement;
  }
}

function purchased(): ExpoIapPurchase {
  return {
    productId: 'pack_space_adventures',
    purchaseState: 'purchased',
    transactionDate: Date.parse(now),
  };
}

describe('Expo IAP purchase provider', () => {
  it('resolves Android product IDs through the catalogue and normalizes Store metadata', async () => {
    const client = new FakeExpoIapClient();
    client.products = [
      {
        id: 'pack_space_adventures',
        displayPrice: 'store-provided price',
        currency: 'INR',
        title: 'Space Adventures',
        description: 'Store description',
      },
    ];
    const provider = new ExpoIAPPurchaseProvider(client, { platform: () => 'android' });
    await expect(provider.loadStoreProducts([commerceKey])).resolves.toEqual({
      state: 'available',
      products: [
        {
          commerceKey,
          platformProductId: 'pack_space_adventures',
          localizedPrice: 'store-provided price',
          currencyCode: 'INR',
          title: 'Space Adventures',
          description: 'Store description',
        },
      ],
    });
  });

  it('uses the planned iOS product ID and reports absent products without a fallback', async () => {
    const client = new FakeExpoIapClient();
    const provider = new ExpoIAPPurchaseProvider(client, { platform: () => 'ios' });
    await expect(provider.loadStoreProducts([commerceKey])).resolves.toEqual({
      state: 'not-found',
    });
    client.onRequest = () =>
      client.emitError({
        code: 'item-unavailable',
        productId: 'com.factnuggets.pack.space_adventures',
      });
    await expect(provider.purchase(commerceKey)).resolves.toMatchObject({
      state: 'failed',
      code: 'product-unavailable',
    });
    expect(client.requested).toEqual([
      { request: { apple: { sku: 'com.factnuggets.pack.space_adventures' } }, type: 'in-app' },
    ]);
  });

  it('normalizes cancellation, pending, already-owned, and store errors distinctly', () => {
    expect(normalizeExpoIapError({ code: 'user-cancelled' }, commerceKey)).toEqual({
      state: 'cancelled',
    });
    expect(normalizeExpoIapError({ code: 'pending' }, commerceKey)).toEqual({
      state: 'pending',
      commerceKey,
    });
    expect(normalizeExpoIapError({ code: 'already-owned' }, commerceKey)).toEqual({
      state: 'already-owned',
      commerceKey,
    });
    expect(normalizeExpoIapError({ code: 'service-error' }, commerceKey)).toMatchObject({
      state: 'failed',
      code: 'store-unavailable',
      retryable: true,
    });
  });

  it('reconciles a native success into one active entitlement before finishing the transaction', async () => {
    const client = new FakeExpoIapClient();
    client.available = [purchased()];
    client.onRequest = () => client.emitPurchase(purchased());
    const provider = new ExpoIAPPurchaseProvider(client, {
      platform: () => 'android',
      now: () => now,
    });
    const entitlements = new InMemoryEntitlements();
    const service = new CommerceService(
      provider,
      entitlements,
      (key) => (key === commerceKey ? spacePack.id : undefined),
      () => now,
    );

    await expect(service.purchase(commerceKey)).resolves.toEqual({ state: 'success', commerceKey });
    expect(await entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'accessible',
      reason: 'entitled',
    });
    expect(client.finished).toEqual([purchased()]);

    await service.reconcileOwnedPurchases();
    expect((await entitlements.listEntitlements()).length).toBe(1);
  });

  it('keeps cancellation and pending purchases locked without progress side effects', async () => {
    for (const state of ['pending', 'cancelled'] as const) {
      const client = new FakeExpoIapClient();
      client.onRequest = () => {
        if (state === 'pending') {
          client.emitPurchase({ ...purchased(), purchaseState: 'pending' });
        } else {
          client.emitError({ code: 'user-cancelled', productId: 'pack_space_adventures' });
        }
      };
      const provider = new ExpoIAPPurchaseProvider(client, { platform: () => 'android' });
      const entitlements = new InMemoryEntitlements();
      expect((await provider.purchase(commerceKey)).state).toBe(state);
      expect(await entitlements.listEntitlements()).toEqual([]);
      expect(await entitlements.getLearningPackAccess(spacePack)).toMatchObject({
        state: 'locked',
      });
    }
  });

  it('fails safely when the native module or Store connection is unavailable', async () => {
    const client = new FakeExpoIapClient();
    client.initError = new Error("Cannot find native module 'ExpoIap'");
    const provider = new ExpoIAPPurchaseProvider(client, { platform: () => 'android' });
    await expect(provider.loadStoreProducts([commerceKey])).resolves.toEqual({
      state: 'unavailable',
      code: 'native-module-unavailable',
      retryable: true,
    });
    await expect(provider.reconcileOwnedPurchases()).resolves.toEqual([]);
  });
});
