import { httpsCallable, type Functions } from 'firebase/functions';

import type {
  FamilyBootstrapCreateResult,
  FamilyBootstrapError,
  FamilyBootstrapStatus,
} from '@app-types/domain/cloud';
import { parseFamilyId } from '@app-types/domain/ids';
import type { FamilyBootstrapRepositoryContract } from '@repositories/contracts/FamilyBootstrapRepositoryContract';

interface FirebaseCallableErrorLike {
  code?: string;
}

function normalizeCallableError(error: unknown): FamilyBootstrapError {
  switch ((error as FirebaseCallableErrorLike | null)?.code) {
    case 'functions/unauthenticated':
      return 'authRequired';
    case 'functions/permission-denied':
      return 'permissionDenied';
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return 'networkUnavailable';
    case 'functions/resource-exhausted':
      return 'rateLimited';
    case 'functions/failed-precondition':
      return 'integrityFailure';
    case 'functions/internal':
      return 'serviceUnavailable';
    default:
      return 'unknownFailure';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseStatus(value: unknown): FamilyBootstrapStatus {
  if (!isPlainObject(value)) return { state: 'failure', error: 'invalidResponse' };
  const keys = Object.keys(value).sort();
  if (value.state === 'none' && keys.length === 1 && keys[0] === 'state') return { state: 'none' };
  if (value.state === 'exists' && keys.join(',') === 'familyId,state') {
    try {
      return { state: 'exists', familyId: parseFamilyId(String(value.familyId)) };
    } catch {
      return { state: 'failure', error: 'invalidResponse' };
    }
  }
  return { state: 'failure', error: 'invalidResponse' };
}

function parseCreated(value: unknown): FamilyBootstrapCreateResult {
  if (
    !isPlainObject(value) ||
    value.state !== 'created' ||
    Object.keys(value).sort().join(',') !== 'familyId,state'
  ) {
    return { state: 'failure', error: 'invalidResponse' };
  }
  try {
    return { state: 'success', familyId: parseFamilyId(String(value.familyId)) };
  } catch {
    return { state: 'failure', error: 'invalidResponse' };
  }
}

/** The sole mobile callable adapter. Raw Functions errors and values stop here. */
export class FirebaseFamilyBootstrapRepository implements FamilyBootstrapRepositoryContract {
  constructor(private readonly functions: Functions) {}

  async getMyFamilyStatus(): Promise<FamilyBootstrapStatus> {
    try {
      const response = await httpsCallable<Record<string, never>, unknown>(
        this.functions,
        'getMyFamilyStatus',
      )({});
      return parseStatus(response.data);
    } catch (error) {
      return { state: 'failure', error: normalizeCallableError(error) };
    }
  }

  async createMyFamily(): Promise<FamilyBootstrapCreateResult> {
    try {
      const response = await httpsCallable<Record<string, never>, unknown>(
        this.functions,
        'createMyFamily',
      )({});
      return parseCreated(response.data);
    } catch (error) {
      return { state: 'failure', error: normalizeCallableError(error) };
    }
  }
}
