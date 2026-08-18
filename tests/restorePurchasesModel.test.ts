import { describe, expect, it } from 'vitest';

import type { CommerceReconciliationResult } from '../application/commerce/CommerceService';
import { RestorePurchasesViewModel } from '../features/parent/hooks/restorePurchasesModel';
import { parseCommerceKey } from '../types/domain/ids';

const key = parseCommerceKey('space-adventures-one-time');

function restored(): CommerceReconciliationResult {
  return {
    state: 'restored',
    restoredCommerceKeys: [key],
    unchangedCommerceKeys: [],
    unknownProductIds: [],
    failedCommerceKeys: [],
  };
}

describe('Phase 8G restore view model', () => {
  it.each([
    ['restored', restored(), 'restored'],
    [
      'nothing found',
      { state: 'nothing-found', unknownProductIds: [] } as CommerceReconciliationResult,
      'nothing-found',
    ],
    [
      'unavailable',
      { state: 'unavailable', retryable: true } as CommerceReconciliationResult,
      'failed',
    ],
    [
      'partial failure',
      {
        state: 'failed',
        restoredCommerceKeys: [key],
        unchangedCommerceKeys: [],
        unknownProductIds: ['legacy_unknown_pack'],
        failedCommerceKeys: [key],
      } as CommerceReconciliationResult,
      'failed',
    ],
  ])('presents %s recovery state safely', async (_name, result, status) => {
    const model = new RestorePurchasesViewModel({
      commerce: { restoreEntitlements: async () => result },
    });
    await model.restore();
    expect(model.snapshot.status).toBe(status);
  });

  it('prevents duplicate parent restore taps while one operation is in flight', async () => {
    let release: ((value: CommerceReconciliationResult) => void) | undefined;
    let calls = 0;
    const pending = new Promise<CommerceReconciliationResult>((resolve) => {
      release = resolve;
    });
    const model = new RestorePurchasesViewModel({
      commerce: {
        restoreEntitlements: async () => {
          calls += 1;
          return pending;
        },
      },
    });
    const first = model.restore();
    const second = model.restore();
    expect(model.snapshot.status).toBe('restoring');
    expect(calls).toBe(1);
    release?.(restored());
    await Promise.all([first, second]);
    expect(model.snapshot.status).toBe('restored');
    expect(calls).toBe(1);
  });
});
