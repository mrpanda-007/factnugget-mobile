import { describe, expect, it } from 'vitest';

import { decideLearningPackAccess } from '../application/commerce/accessDecision';
import { CommerceService } from '../application/commerce/CommerceService';
import type {
  Entitlement,
  OwnedPurchaseQueryResult,
  PurchaseResult,
  ReconciledPurchase,
} from '../types/domain/commerce';
import type { LearningPack } from '../types/domain/content';
import {
  createEntitlementId,
  parseCommerceKey,
  parseContentSlug,
  parseLearningPackId,
  parsePlatformProductId,
  parseWorldId,
} from '../types/domain/ids';
import type { EntitlementRepositoryContract } from '../repositories/contracts/EntitlementRepositoryContract';
import type { PurchaseProviderContract } from '../repositories/contracts/PurchaseProviderContract';

const now = '2026-08-18T00:00:00.000Z';
const commerceKey = parseCommerceKey('space-adventures-one-time');
const spacePack: LearningPack = {
  id: parseLearningPackId('space-adventures'),
  slug: parseContentSlug('space-adventures'),
  worldId: parseWorldId('space'),
  title: 'Space Adventures',
  subtitle: '',
  sortOrder: 1,
  accessType: 'paid',
  commerceKey,
  completionRole: 'required',
  lifecycle: 'published',
  revision: '1',
};

function owned(status: ReconciledPurchase['status'] = 'active'): ReconciledPurchase {
  return {
    commerceKey,
    platformProductId: parsePlatformProductId('pack_space_adventures'),
    source: 'google',
    status,
    grantedAt: now,
    expiresAt: null,
    lastVerifiedAt: now,
    sourceReferenceHash: null,
  };
}

class MemoryEntitlements implements EntitlementRepositoryContract {
  values: Entitlement[] = [];
  writes = 0;
  async getLearningPackAccess(pack: LearningPack) {
    return decideLearningPackAccess(pack, await this.getEntitlementsForLearningPack(pack.id), {
      allowedSources: ['apple', 'google'],
      now: () => now,
    });
  }
  async listEntitlements() {
    return this.values;
  }
  async getEntitlementsForLearningPack(learningPackId: LearningPack['id']) {
    return this.values.filter((value) => value.subject.id === learningPackId);
  }
  async upsertEntitlement(value: Entitlement) {
    this.writes += 1;
    this.values = [...this.values.filter((item) => item.source !== value.source), value];
    return value;
  }
}

class FakeProvider implements PurchaseProviderContract {
  restoreCalls = 0;
  queryCalls = 0;
  finished: ReconciledPurchase[] = [];
  constructor(
    private restoreResult: OwnedPurchaseQueryResult,
    private queryResult: OwnedPurchaseQueryResult = restoreResult,
  ) {}
  async loadStoreProducts() {
    return { state: 'not-found' } as const;
  }
  async purchase(): Promise<PurchaseResult> {
    return { state: 'already-owned', commerceKey };
  }
  async restorePurchases() {
    this.restoreCalls += 1;
    return this.restoreResult;
  }
  async reconcileOwnedPurchases() {
    this.queryCalls += 1;
    return this.queryResult;
  }
  async finishReconciledPurchases(purchases: readonly ReconciledPurchase[]) {
    this.finished.push(...purchases);
  }
}

function service(provider: FakeProvider, entitlements = new MemoryEntitlements()) {
  return {
    entitlements,
    provider,
    commerce: new CommerceService(provider, entitlements, (key) =>
      key === commerceKey ? spacePack.id : undefined,
    ),
  };
}

describe('Phase 8G restore and reconciliation', () => {
  it('rebuilds a fresh local entitlement from an owned Space purchase', async () => {
    const fixture = service(
      new FakeProvider({ state: 'success', purchases: [owned()], unknownProductIds: [] }),
    );
    await expect(fixture.commerce.restoreEntitlements()).resolves.toMatchObject({
      state: 'restored',
      restoredCommerceKeys: [commerceKey],
    });
    expect(await fixture.entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'accessible',
    });
    expect(fixture.provider.finished).toHaveLength(1);
  });

  it('treats an empty owned-purchase result as nothing found without revoking cached access', async () => {
    const entitlements = new MemoryEntitlements();
    await entitlements.upsertEntitlement({
      id: createEntitlementId(),
      subject: { type: 'learningPack', id: spacePack.id },
      source: 'google',
      status: 'active',
      grantedAt: now,
      expiresAt: null,
      lastVerifiedAt: now,
      sourceReferenceHash: null,
      updatedAt: now,
    });
    const fixture = service(
      new FakeProvider({ state: 'success', purchases: [], unknownProductIds: [] }),
      entitlements,
    );
    await expect(fixture.commerce.restoreEntitlements()).resolves.toMatchObject({
      state: 'nothing-found',
    });
    expect(await entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'accessible',
    });
  });

  it('keeps cached access on Store outage and does not grant access to a never-owned Pack', async () => {
    const outage: OwnedPurchaseQueryResult = {
      state: 'unavailable',
      code: 'store-unavailable',
      retryable: true,
    };
    const ownedEntitlements = new MemoryEntitlements();
    await ownedEntitlements.upsertEntitlement({
      id: createEntitlementId(),
      subject: { type: 'learningPack', id: spacePack.id },
      source: 'google',
      status: 'active',
      grantedAt: now,
      expiresAt: null,
      lastVerifiedAt: now,
      sourceReferenceHash: null,
      updatedAt: now,
    });
    await expect(
      service(new FakeProvider(outage), ownedEntitlements).commerce.restoreEntitlements(),
    ).resolves.toMatchObject({ state: 'unavailable' });
    expect(await ownedEntitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'accessible',
    });
    const neverOwned = service(new FakeProvider(outage));
    await neverOwned.commerce.restoreEntitlements();
    expect(await neverOwned.entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'locked',
    });
  });

  it('is idempotent and reports an unchanged already-active entitlement on repeat restore', async () => {
    const fixture = service(
      new FakeProvider({ state: 'success', purchases: [owned()], unknownProductIds: [] }),
    );
    await fixture.commerce.restoreEntitlements();
    await expect(fixture.commerce.restoreEntitlements()).resolves.toMatchObject({
      state: 'restored',
      unchangedCommerceKeys: [commerceKey],
    });
    expect(await fixture.entitlements.listEntitlements()).toHaveLength(1);
  });

  it('ignores unknown Store products while restoring known products', async () => {
    const fixture = service(
      new FakeProvider({
        state: 'success',
        purchases: [owned()],
        unknownProductIds: ['legacy_unknown_pack'],
      }),
    );
    await expect(fixture.commerce.restoreEntitlements()).resolves.toMatchObject({
      state: 'restored',
      unknownProductIds: ['legacy_unknown_pack'],
    });
    expect(await fixture.entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'accessible',
    });
  });

  it('uses the same reconciliation path for already-owned and interrupted purchase recovery', async () => {
    const provider = new FakeProvider(
      { state: 'success', purchases: [owned()], unknownProductIds: [] },
      { state: 'success', purchases: [owned()], unknownProductIds: [] },
    );
    const fixture = service(provider);
    await fixture.commerce.purchase(commerceKey);
    await fixture.commerce.reconcileOwnedPurchases();
    expect(provider.queryCalls).toBe(2);
    expect(await fixture.entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'accessible',
    });
    expect(await fixture.entitlements.listEntitlements()).toHaveLength(1);
  });

  it('preserves a revoked entitlement row when authoritative provider data says revoked', async () => {
    const fixture = service(
      new FakeProvider({ state: 'success', purchases: [owned('revoked')], unknownProductIds: [] }),
    );
    await fixture.commerce.restoreEntitlements();
    expect((await fixture.entitlements.listEntitlements())[0]).toMatchObject({ status: 'revoked' });
    expect(await fixture.entitlements.getLearningPackAccess(spacePack)).toMatchObject({
      state: 'locked',
      reason: 'revoked',
    });
  });
});
