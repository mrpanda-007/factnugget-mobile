import { describe, expect, it } from 'vitest';

import { BackupAndSyncViewModel } from '../features/parent/hooks/backupAndSyncModel';
import type { CloudAccountBinding, ParentAuthSession } from '../types/domain/cloud';
import { parseAuthUserId, parseFamilyId } from '../types/domain/ids';

const timestamp = '2026-08-18T00:00:00.000Z';
const userA = parseAuthUserId('parent-a');
const userB = parseAuthUserId('parent-b');
const familyA = parseFamilyId('00000000-0000-4000-8000-0000000000a1');
const familyB = parseFamilyId('00000000-0000-4000-8000-0000000000b2');
const session: ParentAuthSession = {
  authUserId: userA,
  email: null,
  emailVerified: true,
  createdAt: timestamp,
};

function dependencies(
  options: {
    session?: ParentAuthSession | null;
    binding?: CloudAccountBinding;
    remote?: 'none' | 'exists';
    createdFamily?: typeof familyA;
    sync?: 'success' | 'offline' | 'partial';
  } = {},
) {
  let currentSession = options.session ?? null;
  let binding = options.binding ?? { state: 'unbound' as const };
  let bindCalls = 0;
  let seedCalls = 0;
  let cloudCalls = 0;
  const result = {
    account: {
      createAccount: async () => {
        currentSession = session;
        return { state: 'success' as const, session };
      },
      signIn: async () => {
        currentSession = session;
        return { state: 'success' as const, session };
      },
      signOut: async () => {
        currentSession = null;
        return { state: 'success' as const };
      },
      requestPasswordReset: async () => ({ state: 'success' as const }),
      getSession: async () => currentSession,
      getAuthState: () => ({ state: 'ready' as const, session: currentSession }),
      observeAuthState: () => () => undefined,
      start: () => () => undefined,
      getBinding: async () => binding,
    },
    bootstrap: {
      getMyFamilyStatus: async () =>
        options.remote === 'exists'
          ? { state: 'exists' as const, familyId: familyA }
          : { state: 'none' as const },
      createMyFamily: async () => ({
        state: 'success' as const,
        familyId: options.createdFamily ?? familyA,
      }),
    },
    setup: {
      bindAndSeed: async (authUserId: typeof userA, familyId: typeof familyA) => {
        bindCalls += 1;
        binding = {
          state: 'bound',
          authUserId,
          familyId,
          boundAt: timestamp,
          updatedAt: timestamp,
        };
        return { state: 'ready' as const, pendingCount: 2, explorerIds: [] };
      },
      syncSeeded: async () => {
        seedCalls += 1;
        if (options.sync === 'offline')
          return { state: 'failure' as const, error: 'offline' as const };
        if (options.sync === 'partial')
          return {
            state: 'partial' as const,
            error: 'retryableFailure' as const,
            remainingPending: 1,
          };
        return { state: 'success' as const, remainingPending: 0 };
      },
      listLocalExplorerIds: async () => [],
    },
    outbox: { countPending: async () => 0 },
    counts: () => ({ bindCalls, seedCalls, cloudCalls, binding }),
  };
  // The view model must not call transport before a local bind is established.
  result.setup.syncSeeded = async () => {
    cloudCalls += 1;
    seedCalls += 1;
    if (options.sync === 'offline') return { state: 'failure' as const, error: 'offline' as const };
    if (options.sync === 'partial')
      return { state: 'partial' as const, error: 'retryableFailure' as const, remainingPending: 1 };
    return { state: 'success' as const, remainingPending: 0 };
  };
  return result;
}

describe('Phase 9F Backup & Sync parent state model', () => {
  it('keeps signed-out guests local and pauses a signed-out existing binding', async () => {
    const guest = dependencies();
    expect((await new BackupAndSyncViewModel(guest as never).refresh()).status).toBe(
      'localOnlySignedOut',
    );
    const bound = dependencies({
      binding: {
        state: 'bound',
        authUserId: userA,
        familyId: familyA,
        boundAt: timestamp,
        updatedAt: timestamp,
      },
    });
    expect((await new BackupAndSyncViewModel(bound as never).refresh()).status).toBe(
      'signedOutBound',
    );
  });

  it('creates a Family only after explicit new-account setup, then binds, seeds, and syncs', async () => {
    const values = dependencies({ sync: 'success' });
    const model = new BackupAndSyncViewModel(values as never);
    expect((await model.createAccount('parent@example.test', 'secret1')).status).toBe('connected');
    expect(values.counts()).toMatchObject({
      bindCalls: 1,
      seedCalls: 1,
      cloudCalls: 1,
      binding: { state: 'bound', familyId: familyA },
    });
  });

  it('requires an explicit choice before an existing Family can bind or upload local Explorers', async () => {
    const values = dependencies({ session, remote: 'exists' });
    const model = new BackupAndSyncViewModel(values as never);
    expect((await model.refresh()).status).toBe('existingFamilyChoiceRequired');
    expect(values.counts().bindCalls).toBe(0);
    expect(model.keepLocal().status).toBe('authenticatedUnbound');
    expect(values.counts().bindCalls).toBe(0);
    expect((await model.addThisDevice()).status).toBe('connected');
    expect(values.counts()).toMatchObject({
      bindCalls: 1,
      cloudCalls: 1,
      binding: { familyId: familyA },
    });
  });

  it('fails closed on a different authenticated parent without cloud lookup or queue reassignment', async () => {
    const values = dependencies({
      session: { ...session, authUserId: userB },
      binding: {
        state: 'bound',
        authUserId: userA,
        familyId: familyB,
        boundAt: timestamp,
        updatedAt: timestamp,
      },
    });
    expect((await new BackupAndSyncViewModel(values as never).refresh()).status).toBe(
      'accountMismatch',
    );
    expect(values.counts().bindCalls).toBe(0);
  });

  it('keeps setup bound and reports offline or partial sync without a false up-to-date state', async () => {
    const offline = new BackupAndSyncViewModel(dependencies({ sync: 'offline' }) as never);
    expect((await offline.createAccount('parent@example.test', 'secret1')).status).toBe('offline');
    const partial = new BackupAndSyncViewModel(dependencies({ sync: 'partial' }) as never);
    expect((await partial.createAccount('parent@example.test', 'secret1')).status).toBe(
      'pendingChanges',
    );
  });
});
