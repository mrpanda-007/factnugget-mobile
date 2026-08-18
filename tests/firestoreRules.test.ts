import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import {
  CloudTransportError,
  FirestoreCloudSyncRepository,
} from '../repositories/adapters/FirestoreCloudSyncRepository';

const enabled = process.env.FIRESTORE_EMULATOR_TEST === 'true';
const familyA = '00000000-0000-4000-8000-0000000000a1';
const familyB = '00000000-0000-4000-8000-0000000000b2';
const explorerId = '00000000-0000-4000-8000-000000000001';
const timestamp = '2026-08-18T00:00:00.000Z';
let testEnvironment: RulesTestEnvironment;

function explorer() {
  return { explorerId, lookId: 'animal', createdAt: timestamp, schemaVersion: 1 };
}

function discovery(overrides: Record<string, unknown> = {}) {
  return {
    explorerId,
    discoveryId: 'blue-whale',
    revealedAt: timestamp,
    collectedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

describe.skipIf(!enabled)('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'factnuggets-phase9e',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
  });

  beforeEach(async () => {
    await testEnvironment.clearFirestore();
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await setDoc(doc(firestore, `families/${familyA}`), {
        familyId: familyA,
        createdAt: timestamp,
        schemaVersion: 1,
      });
      await setDoc(doc(firestore, `families/${familyA}/members/parent-a`), {
        familyId: familyA,
        authUserId: 'parent-a',
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      });
      await setDoc(doc(firestore, `families/${familyA}/members/parent-co`), {
        familyId: familyA,
        authUserId: 'parent-co',
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      });
      await setDoc(doc(firestore, `families/${familyB}/members/parent-b`), {
        familyId: familyB,
        authUserId: 'parent-b',
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      });
    });
  });

  afterAll(async () => testEnvironment.cleanup());

  it('denies unauthenticated family reads and writes', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(firestore, `families/${familyA}`)));
    await assertFails(
      setDoc(doc(firestore, `families/${familyA}/explorers/${explorerId}`), explorer()),
    );
  });

  it('allows a valid same-family Explorer and progress write', async () => {
    const firestore = testEnvironment.authenticatedContext('parent-a').firestore();
    await assertSucceeds(
      setDoc(doc(firestore, `families/${familyA}/explorers/${explorerId}`), explorer()),
    );
    await assertSucceeds(
      setDoc(
        doc(firestore, `families/${familyA}/explorers/${explorerId}/discoveryProgress/blue-whale`),
        discovery(),
      ),
    );
    await assertSucceeds(getDoc(doc(firestore, `families/${familyA}`)));
  });

  it('denies cross-family reads and writes', async () => {
    const firestore = testEnvironment.authenticatedContext('parent-a').firestore();
    await assertFails(getDoc(doc(firestore, `families/${familyB}`)));
    await assertFails(
      setDoc(doc(firestore, `families/${familyB}/explorers/${explorerId}`), explorer()),
    );
  });

  it('denies arbitrary membership self-enrollment', async () => {
    const firestore = testEnvironment.authenticatedContext('parent-a').firestore();
    await assertFails(
      setDoc(doc(firestore, `families/${familyB}/members/parent-a`), {
        familyId: familyB,
        authUserId: 'parent-a',
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      }),
    );
  });

  it('denies malformed, unknown-schema, extra-field, and path-mismatched documents', async () => {
    const firestore = testEnvironment.authenticatedContext('parent-a').firestore();
    const path = `families/${familyA}/explorers/${explorerId}/discoveryProgress/blue-whale`;
    await assertFails(setDoc(doc(firestore, path), discovery({ schemaVersion: 2 })));
    await assertFails(setDoc(doc(firestore, path), discovery({ unexpected: true })));
    await assertFails(setDoc(doc(firestore, path), discovery({ discoveryId: 'dolphin' })));
    await assertFails(setDoc(doc(firestore, path), { explorerId }));
  });

  it('denies deletes and entitlement/purchase-authority paths', async () => {
    const firestore = testEnvironment.authenticatedContext('parent-a').firestore();
    const explorerPath = `families/${familyA}/explorers/${explorerId}`;
    await assertSucceeds(setDoc(doc(firestore, explorerPath), explorer()));
    await assertFails(deleteDoc(doc(firestore, explorerPath)));
    await assertFails(
      setDoc(doc(firestore, `families/${familyA}/local_entitlements/forbidden`), { active: true }),
    );
  });

  it('runs adapter transactional merge and rejects malformed remote DTOs', async () => {
    const first = new FirestoreCloudSyncRepository(
      testEnvironment.authenticatedContext('parent-a').firestore() as never,
    );
    const second = new FirestoreCloudSyncRepository(
      testEnvironment.authenticatedContext('parent-co').firestore() as never,
    );
    const explorerDto = explorer();
    expect(await first.upsertExplorer(familyA as never, explorerDto)).toEqual({ state: 'success' });
    expect(
      await first.upsertDiscoveryProgress(familyA as never, {
        ...discovery(),
        revealedAt: '2026-08-17T00:00:00.000Z',
      }),
    ).toEqual({ state: 'success' });
    expect(
      await second.upsertDiscoveryProgress(familyA as never, {
        ...discovery(),
        revealedAt: timestamp,
        collectedAt: '2026-08-19T00:00:00.000Z',
      }),
    ).toEqual({ state: 'success' });
    const merged = await first.pullExplorerState(familyA as never, explorerDto);
    expect(merged?.discoveryProgress[0]).toMatchObject({
      revealedAt: '2026-08-17T00:00:00.000Z',
      collectedAt: '2026-08-19T00:00:00.000Z',
    });

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `families/${familyA}/explorers/${explorerId}/discoveryProgress/blue-whale`,
        ),
        { invalid: true },
      );
    });
    await expect(first.pullExplorerState(familyA as never, explorerDto)).rejects.toMatchObject(
      new CloudTransportError('invalidRemoteData'),
    );
  });
});
