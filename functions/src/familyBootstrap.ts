import { randomUUID } from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const schemaVersion = 1;
const indexCollection = 'accountFamilyIndex';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StatusResponse = { state: 'none' } | { state: 'exists'; familyId: string };
type CreateResponse = { state: 'created'; familyId: string };

function configuredRegion(): string {
  return process.env.FUNCTIONS_REGION?.trim() || 'us-central1';
}

function requireUid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid)
    throw new HttpsError('unauthenticated', 'Sign in to manage Backup & Sync.');
  return request.auth.uid;
}

function requireEmptyPayload(data: unknown): void {
  if (data === null || data === undefined) return;
  if (typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 0) {
    throw new HttpsError('invalid-argument', 'This operation does not accept account identifiers.');
  }
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}

function validFamily(value: unknown, familyId: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    exactKeys(value as Record<string, unknown>, ['familyId', 'createdAt', 'schemaVersion']) &&
    (value as Record<string, unknown>).familyId === familyId &&
    uuidPattern.test(familyId) &&
    isTimestamp((value as Record<string, unknown>).createdAt) &&
    (value as Record<string, unknown>).schemaVersion === schemaVersion
  );
}

function validMembership(value: unknown, familyId: string, uid: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    exactKeys(value as Record<string, unknown>, [
      'familyId',
      'authUserId',
      'role',
      'createdAt',
      'schemaVersion',
    ]) &&
    (value as Record<string, unknown>).familyId === familyId &&
    (value as Record<string, unknown>).authUserId === uid &&
    (value as Record<string, unknown>).role === 'parent' &&
    isTimestamp((value as Record<string, unknown>).createdAt) &&
    (value as Record<string, unknown>).schemaVersion === schemaVersion
  );
}

function indexFamilyId(value: unknown): string | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !exactKeys(value as Record<string, unknown>, ['familyId', 'createdAt', 'schemaVersion'])
  )
    return null;
  const data = value as Record<string, unknown>;
  return typeof data.familyId === 'string' &&
    uuidPattern.test(data.familyId) &&
    isTimestamp(data.createdAt) &&
    data.schemaVersion === schemaVersion
    ? data.familyId
    : null;
}

async function getVerifiedFamily(uid: string): Promise<StatusResponse> {
  const db = getFirestore();
  const index = await db.collection(indexCollection).doc(uid).get();
  if (!index.exists) return { state: 'none' };
  const familyId = indexFamilyId(index.data());
  if (!familyId)
    throw new HttpsError('failed-precondition', 'The account Family record is inconsistent.');
  const [family, member] = await Promise.all([
    db.collection('families').doc(familyId).get(),
    db.collection('families').doc(familyId).collection('members').doc(uid).get(),
  ]);
  if (
    !family.exists ||
    !member.exists ||
    !validFamily(family.data(), familyId) ||
    !validMembership(member.data(), familyId, uid)
  ) {
    throw new HttpsError('failed-precondition', 'The account Family record is inconsistent.');
  }
  return { state: 'exists', familyId };
}

export const getMyFamilyStatus = onCall(
  { region: configuredRegion() },
  async (request): Promise<StatusResponse> => {
    requireEmptyPayload(request.data);
    return getVerifiedFamily(requireUid(request));
  },
);

export const createMyFamily = onCall(
  { region: configuredRegion() },
  async (request): Promise<CreateResponse> => {
    requireEmptyPayload(request.data);
    const uid = requireUid(request);
    const db = getFirestore();
    return db.runTransaction(async (transaction) => {
      const indexReference = db.collection(indexCollection).doc(uid);
      const index = await transaction.get(indexReference);
      if (index.exists) {
        const familyId = indexFamilyId(index.data());
        if (!familyId)
          throw new HttpsError('failed-precondition', 'The account Family record is inconsistent.');
        const familyReference = db.collection('families').doc(familyId);
        const memberReference = familyReference.collection('members').doc(uid);
        const [family, member] = await Promise.all([
          transaction.get(familyReference),
          transaction.get(memberReference),
        ]);
        if (
          !family.exists ||
          !member.exists ||
          !validFamily(family.data(), familyId) ||
          !validMembership(member.data(), familyId, uid)
        ) {
          throw new HttpsError('failed-precondition', 'The account Family record is inconsistent.');
        }
        return { state: 'created', familyId };
      }

      const familyId = randomUUID();
      const createdAt = new Date().toISOString();
      const familyReference = db.collection('families').doc(familyId);
      transaction.create(familyReference, { familyId, createdAt, schemaVersion });
      transaction.create(familyReference.collection('members').doc(uid), {
        familyId,
        authUserId: uid,
        role: 'parent',
        createdAt,
        schemaVersion,
      });
      transaction.create(indexReference, { familyId, createdAt, schemaVersion });
      return { state: 'created', familyId };
    });
  },
);
