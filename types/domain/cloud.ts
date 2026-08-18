import type { AuthUserId, FamilyId } from './ids';

export interface Family {
  id: FamilyId;
  createdAt: string;
  schemaVersion: number;
}

export interface FamilyMember {
  familyId: FamilyId;
  authUserId: AuthUserId;
  role: 'parent';
  createdAt: string;
}

/** Normalized parent-only session; child Explorers never authenticate. */
export interface ParentAuthSession {
  authUserId: AuthUserId;
  email: string | null;
  emailVerified: boolean;
  createdAt: string | null;
}

export type ParentAuthFailureCode =
  | 'invalidCredentials'
  | 'emailAlreadyInUse'
  | 'weakPassword'
  | 'networkUnavailable'
  | 'rateLimited'
  | 'requiresVerification'
  | 'unavailable'
  | 'unknownFailure';

export type ParentAuthResult =
  | { state: 'success'; session: ParentAuthSession }
  | { state: 'failure'; code: ParentAuthFailureCode };

export type ParentAuthActionResult =
  | { state: 'success' }
  | {
      state: 'failure';
      code: Exclude<ParentAuthFailureCode, 'invalidCredentials' | 'emailAlreadyInUse'>;
    };

export type PasswordResetResult = ParentAuthActionResult;

/** Runtime-only parent Auth state. It has no relationship to child Explorer availability. */
export type ParentAuthState =
  { state: 'restoring'; session: null } | { state: 'ready'; session: ParentAuthSession | null };

/** Future local-binding state. It is a contract only until the SQLite V4 migration. */
export type CloudAccountBinding =
  | { state: 'unbound' }
  | {
      state: 'bound';
      authUserId: AuthUserId;
      familyId: FamilyId;
      boundAt: string;
      updatedAt: string;
    }
  | {
      state: 'mergeRequired';
      authUserId: AuthUserId;
      familyId: FamilyId;
      boundAt: string;
      updatedAt: string;
    };

export type SyncEntityType =
  | 'explorer'
  | 'discoveryProgress'
  | 'packDiscoveryProgress'
  | 'learningPackProgress'
  | 'earnedBadge';

export interface SyncOperation {
  operationId: string;
  familyId: FamilyId;
  entityType: SyncEntityType;
  entityId: string;
  operation: 'upsert';
  createdAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: CloudSyncError | null;
}

export type SyncDirection = 'push' | 'pull' | 'reconcile';
export type CloudSyncError =
  | 'offline'
  | 'authRequired'
  | 'permissionDenied'
  | 'retryableFailure'
  | 'invalidRemoteData'
  | 'invalidLocalData'
  | 'notFound'
  | 'rateLimited'
  | 'resourceExhausted'
  | 'permanentFailure'
  | 'unknownFailure'
  | 'bindingMismatch'
  | 'unbound'
  | 'unavailable';
export type CloudSyncResult =
  | {
      state: 'success';
      pushed?: number;
      pulled?: number;
      merged?: number;
      remainingPending?: number;
    }
  | {
      state: 'partial';
      error: CloudSyncError;
      pushed?: number;
      pulled?: number;
      merged?: number;
      remainingPending?: number;
    }
  | {
      state: 'failure';
      error: CloudSyncError;
      pushed?: number;
      pulled?: number;
      merged?: number;
      remainingPending?: number;
    };
