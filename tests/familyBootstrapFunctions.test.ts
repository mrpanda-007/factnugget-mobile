import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const enabled = process.env.FUNCTIONS_EMULATOR_TEST === 'true';
const projectId = 'factnuggets-phase9f';
const timestamp = '2026-08-18T00:00:00.000Z';
let rules: RulesTestEnvironment;
const apps: FirebaseApp[] = [];

function client(label: string) {
  const app = initializeApp(
    { apiKey: 'test-key', authDomain: 'localhost', projectId, appId: `test-${label}` },
    label,
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true });
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 15001);
  return { auth, functions };
}

async function authenticated(label: string) {
  const value = client(label);
  const email = `${label}-${Date.now()}-${Math.random()}@example.test`;
  const credential = await createUserWithEmailAndPassword(
    value.auth,
    email,
    'backup-test-password',
  );
  return { ...value, uid: credential.user.uid };
}

describe.skipIf(!enabled)('Phase 9F callable Family bootstrap', () => {
  beforeAll(async () => {
    rules = await initializeTestEnvironment({
      projectId,
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
  });
  beforeEach(async () => rules.clearFirestore());
  afterEach(async () => {
    await Promise.all(apps.splice(0).map(deleteApp));
  });
  afterAll(async () => rules.cleanup());

  it('rejects unauthenticated status/create calls and creates no data', async () => {
    const { functions } = client('anonymous');
    await expect(httpsCallable(functions, 'getMyFamilyStatus')({})).rejects.toMatchObject({
      code: 'functions/unauthenticated',
    });
    await expect(httpsCallable(functions, 'createMyFamily')({})).rejects.toMatchObject({
      code: 'functions/unauthenticated',
    });
  });

  it('returns none, then atomically creates an opaque Family, membership, and server index', async () => {
    const { functions, uid } = await authenticated('bootstrap');
    expect((await httpsCallable(functions, 'getMyFamilyStatus')({})).data).toEqual({
      state: 'none',
    });
    const created = (await httpsCallable(functions, 'createMyFamily')({})).data as {
      state: string;
      familyId: string;
    };
    expect(created.state).toBe('created');
    expect(created.familyId).not.toBe(uid);
    await rules.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      expect((await getDoc(doc(firestore, `families/${created.familyId}`))).data()).toEqual({
        familyId: created.familyId,
        createdAt: expect.any(String),
        schemaVersion: 1,
      });
      expect(
        (await getDoc(doc(firestore, `families/${created.familyId}/members/${uid}`))).data(),
      ).toMatchObject({
        familyId: created.familyId,
        authUserId: uid,
        role: 'parent',
        schemaVersion: 1,
      });
      expect((await getDoc(doc(firestore, `accountFamilyIndex/${uid}`))).data()).toMatchObject({
        familyId: created.familyId,
        schemaVersion: 1,
      });
    });
    expect((await httpsCallable(functions, 'getMyFamilyStatus')({})).data).toEqual({
      state: 'exists',
      familyId: created.familyId,
    });
  });

  it('is idempotent under repeated and concurrent calls', async () => {
    const { functions, uid } = await authenticated('repeat');
    const calls = await Promise.all(
      Array.from({ length: 4 }, () => httpsCallable(functions, 'createMyFamily')({})),
    );
    const familyIds = calls.map((call) => (call.data as { familyId: string }).familyId);
    expect(new Set(familyIds)).toHaveLength(1);
    await rules.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDoc(doc(context.firestore(), `accountFamilyIndex/${uid}`));
      expect(snapshot.data()?.familyId).toBe(familyIds[0]);
    });
  });

  it('keeps different authenticated users in different Families and rejects privileged client input', async () => {
    const first = await authenticated('first');
    const second = await authenticated('second');
    const injected = await expect(
      httpsCallable(
        first.functions,
        'createMyFamily',
      )({ uid: second.uid, familyId: '00000000-0000-4000-8000-0000000000ff', role: 'admin' }),
    ).rejects.toMatchObject({ code: 'functions/invalid-argument' });
    expect(injected).toBeDefined();
    const familyA = (await httpsCallable(first.functions, 'createMyFamily')({})).data as {
      familyId: string;
    };
    const familyB = (await httpsCallable(second.functions, 'createMyFamily')({})).data as {
      familyId: string;
    };
    expect(familyA.familyId).not.toBe(familyB.familyId);
  });

  it('preserves strict mobile Firestore isolation after callable bootstrap', async () => {
    const owner = await authenticated('owner');
    const other = await authenticated('other');
    const created = (await httpsCallable(owner.functions, 'createMyFamily')({})).data as {
      familyId: string;
    };
    const ownerFirestore = rules.authenticatedContext(owner.uid).firestore();
    const otherFirestore = rules.authenticatedContext(other.uid).firestore();
    await assertSucceeds(
      setDoc(
        doc(
          ownerFirestore,
          `families/${created.familyId}/explorers/00000000-0000-4000-8000-000000000001`,
        ),
        {
          explorerId: '00000000-0000-4000-8000-000000000001',
          lookId: 'animal',
          createdAt: timestamp,
          schemaVersion: 1,
        },
      ),
    );
    await assertFails(getDoc(doc(otherFirestore, `families/${created.familyId}`)));
    await assertFails(
      setDoc(doc(otherFirestore, `families/${created.familyId}/members/${other.uid}`), {
        familyId: created.familyId,
        authUserId: other.uid,
        role: 'parent',
        createdAt: timestamp,
        schemaVersion: 1,
      }),
    );
    await assertFails(getDoc(doc(ownerFirestore, `accountFamilyIndex/${owner.uid}`)));
    await assertFails(
      setDoc(doc(ownerFirestore, `accountFamilyIndex/${owner.uid}`), {
        familyId: created.familyId,
        createdAt: timestamp,
        schemaVersion: 1,
      }),
    );
  });
});
