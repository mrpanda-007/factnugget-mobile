import { describe, expect, it } from 'vitest';

import { AccountSwitchService } from '../application/sync/AccountSwitchService';
import type { CloudAccountBinding, ParentAuthSession } from '../types/domain/cloud';
import { parseAuthUserId, parseFamilyId } from '../types/domain/ids';

const timestamp = '2026-08-18T00:00:00.000Z';
const userA = parseAuthUserId('parent-a');
const userB = parseAuthUserId('parent-b');
const familyA = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const familyB = parseFamilyId('00000000-0000-4000-8000-0000000000b2');

function dependencies(
  options: {
    session?: ParentAuthSession | null;
    pending?: number;
    replaceFails?: boolean;
    status?: 'exists' | 'none';
  } = {},
) {
  let binding: CloudAccountBinding = {
    state: 'bound',
    authUserId: userA,
    familyId: familyA,
    boundAt: timestamp,
    updatedAt: timestamp,
  };
  let targetCreated = false;
  const session = options.session ?? {
    authUserId: userB,
    email: null,
    emailVerified: true,
    createdAt: timestamp,
  };
  const outbox = [{ familyId: familyA, entityId: 'old-family-row' }];
  return {
    values: {
      get binding() {
        return binding;
      },
      outbox,
    },
    service: new AccountSwitchService({
      bindings: {
        getCurrentBinding: async () => binding,
        bind: async () => binding,
        replaceBinding: async (input) => {
          if (options.replaceFails) throw new Error('forced');
          binding = {
            state: 'bound',
            authUserId: input.authUserId,
            familyId: input.familyId,
            boundAt: input.boundAt,
            updatedAt: input.boundAt,
          };
          return binding;
        },
        detach: async () => undefined,
      },
      outbox: { countPending: async () => options.pending ?? 1 },
      session: { getSession: async () => session },
      bootstrap: {
        getMyFamilyStatus: async () =>
          options.status === 'none' && !targetCreated
            ? { state: 'none' as const }
            : { state: 'exists' as const, familyId: familyB },
        createMyFamily: async () => {
          targetCreated = true;
          return { state: 'success' as const, familyId: familyB };
        },
      },
      now: () => timestamp,
    }),
  };
}

describe('Phase 9G account switching', () => {
  it('reports pending old-family work without moving it, then atomically replaces only the binding after confirmation', async () => {
    const runtime = dependencies({ pending: 3 });
    expect(await runtime.service.prepare()).toEqual({
      state: 'ready',
      targetFamilyId: familyB,
      pendingOldChanges: 3,
    });
    expect(await runtime.service.finalize(familyB)).toEqual({
      state: 'success',
      familyId: familyB,
    });
    expect(runtime.values.binding).toMatchObject({ authUserId: userB, familyId: familyB });
    expect(runtime.values.outbox).toEqual([{ familyId: familyA, entityId: 'old-family-row' }]);
  });

  it('preserves the old binding if atomic replacement fails', async () => {
    const runtime = dependencies({ replaceFails: true });
    expect(await runtime.service.finalize(familyB)).toEqual({
      state: 'failure',
      error: 'unknownFailure',
    });
    expect(runtime.values.binding).toMatchObject({ authUserId: userA, familyId: familyA });
  });

  it('does not detach or reseed when the signed-in parent is already the linked account', async () => {
    const runtime = dependencies({
      session: { authUserId: userA, email: null, emailVerified: true, createdAt: timestamp },
    });
    expect(await runtime.service.prepare()).toEqual({ state: 'sameAccount' });
    expect(runtime.values.binding).toMatchObject({ familyId: familyA });
  });

  it('requires explicit Family setup for a target account with no Family', async () => {
    const runtime = dependencies({ status: 'none' });
    expect(await runtime.service.prepare()).toEqual({
      state: 'targetNeedsFamily',
      pendingOldChanges: 1,
    });
    expect(await runtime.service.createTargetFamily()).toEqual({
      state: 'ready',
      targetFamilyId: familyB,
      pendingOldChanges: 1,
    });
    expect(runtime.values.binding).toMatchObject({ familyId: familyA });
  });
});
