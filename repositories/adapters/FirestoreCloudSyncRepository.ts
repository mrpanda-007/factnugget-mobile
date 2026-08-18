import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';

import {
  parseCloudDiscoveryProgressDto,
  parseCloudEarnedBadgeDto,
  parseCloudExplorerDto,
  parseCloudFamilyDto,
  parseCloudFamilyMemberDto,
  parseCloudLearningPackProgressDto,
  parseCloudPackDiscoveryProgressDto,
  toCloudDiscoveryProgressDto,
  toCloudEarnedBadgeDto,
  toCloudExplorerDto,
  toCloudLearningPackProgressDto,
  toCloudPackDiscoveryProgressDto,
} from '../../application/sync/cloudDtoMappers';
import {
  badgePath,
  discoveryProgressPath,
  explorerPath,
  familyMemberPath,
  familyPath,
  learningPackProgressPath,
  packDiscoveryDocumentId,
  packDiscoveryProgressPath,
} from '../../application/sync/cloudPaths';
import {
  mergeDiscoveryProgress,
  mergeEarnedBadge,
  mergeLearningPackProgress,
  mergePackDiscoveryProgress,
} from '../../application/sync/merge/progressMerge';
import type { CloudSyncError, CloudSyncResult } from '@app-types/domain/cloud';
import {
  parseDiscoveryId,
  parseExplorerId,
  parseLearningPackId,
  parseWorldId,
  type AuthUserId,
  type FamilyId,
} from '@app-types/domain/ids';
import type {
  CloudDiscoveryProgressDto,
  CloudEarnedBadgeDto,
  CloudExplorerDto,
  CloudExplorerStateDto,
  CloudFamilyDto,
  CloudFamilyMemberDto,
  CloudLearningPackProgressDto,
  CloudPackDiscoveryProgressDto,
} from '@app-types/cloud/dto';
import type { CloudSyncRepositoryContract } from '@repositories/contracts/CloudSyncRepositoryContract';

export class CloudTransportError extends Error {
  constructor(readonly syncError: CloudSyncError) {
    super(syncError);
  }
}

export function normalizeFirestoreError(error: unknown): CloudSyncError {
  if (error instanceof CloudTransportError) return error.syncError;
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case 'permission-denied':
      return 'permissionDenied';
    case 'unauthenticated':
      return 'authRequired';
    case 'not-found':
      return 'notFound';
    case 'resource-exhausted':
      return 'resourceExhausted';
    case 'deadline-exceeded':
    case 'unavailable':
    case 'network-request-failed':
      return 'offline';
    case 'cancelled':
    case 'aborted':
      return 'retryableFailure';
    case 'invalid-argument':
    case 'failed-precondition':
      return 'permanentFailure';
    default:
      return 'unknownFailure';
  }
}

function failed(error: unknown): CloudSyncResult {
  return { state: 'failure', error: normalizeFirestoreError(error) };
}

/** Firestore transport adapter. Firebase types and snapshots remain contained here. */
export class FirestoreCloudSyncRepository implements CloudSyncRepositoryContract {
  constructor(private readonly firestore: Firestore) {}

  async getFamily(familyId: FamilyId): Promise<CloudFamilyDto | null> {
    try {
      const snapshot = await getDoc(doc(this.firestore, familyPath(familyId)));
      return snapshot.exists() ? toFamilyDto(snapshot.data()) : null;
    } catch (error) {
      throw new CloudTransportError(normalizeFirestoreError(error));
    }
  }

  async getFamilyMembership(
    familyId: FamilyId,
    authUserId: AuthUserId,
  ): Promise<CloudFamilyMemberDto | null> {
    try {
      const snapshot = await getDoc(doc(this.firestore, familyMemberPath(familyId, authUserId)));
      return snapshot.exists() ? toFamilyMemberDto(snapshot.data()) : null;
    } catch (error) {
      throw new CloudTransportError(normalizeFirestoreError(error));
    }
  }

  async listFamilyExplorers(familyId: FamilyId): Promise<CloudExplorerDto[]> {
    try {
      const snapshots = await getDocs(
        collection(this.firestore, familyPath(familyId), 'explorers'),
      );
      return snapshots.docs.map((snapshot) => {
        const explorer = toExplorerDto(snapshot.data());
        if (explorer.explorerId !== snapshot.id) throw new CloudTransportError('invalidRemoteData');
        return explorer;
      });
    } catch (error) {
      if (error instanceof CloudTransportError) throw error;
      throw new CloudTransportError(normalizeFirestoreError(error));
    }
  }

  async pullExplorerState(
    familyId: FamilyId,
    explorer: CloudExplorerDto,
  ): Promise<CloudExplorerStateDto | null> {
    try {
      const explorerReference = doc(
        this.firestore,
        explorerPath(familyId, parseExplorerId(explorer.explorerId)),
      );
      const explorerSnapshot = await getDoc(explorerReference);
      if (!explorerSnapshot.exists()) return null;
      const [discovery, packDiscovery, pack, badges] = await Promise.all([
        getDocs(collection(explorerReference, 'discoveryProgress')),
        getDocs(collection(explorerReference, 'packDiscoveryProgress')),
        getDocs(collection(explorerReference, 'learningPackProgress')),
        getDocs(collection(explorerReference, 'badges')),
      ]);
      const remoteExplorer = toExplorerDto(explorerSnapshot.data());
      if (remoteExplorer.explorerId !== explorer.explorerId)
        throw new CloudTransportError('invalidRemoteData');
      const discoveryProgress = discovery.docs.map((item) => {
        const value = toDiscoveryDto(item.data());
        if (value.explorerId !== explorer.explorerId || value.discoveryId !== item.id) {
          throw new CloudTransportError('invalidRemoteData');
        }
        return value;
      });
      const packDiscoveryProgress = packDiscovery.docs.map((item) => {
        const value = toPackDiscoveryDto(item.data());
        if (
          value.explorerId !== explorer.explorerId ||
          packDiscoveryDocumentId(
            parseLearningPackId(value.learningPackId),
            parseDiscoveryId(value.discoveryId),
          ) !== item.id
        ) {
          throw new CloudTransportError('invalidRemoteData');
        }
        return value;
      });
      const learningPackProgress = pack.docs.map((item) => {
        const value = toLearningPackDto(item.data());
        if (value.explorerId !== explorer.explorerId || value.learningPackId !== item.id) {
          throw new CloudTransportError('invalidRemoteData');
        }
        return value;
      });
      const earnedBadges = badges.docs.map((item) => {
        const value = toBadgeDto(item.data());
        if (value.explorerId !== explorer.explorerId || value.worldId !== item.id) {
          throw new CloudTransportError('invalidRemoteData');
        }
        return value;
      });
      return {
        explorer: remoteExplorer,
        discoveryProgress,
        packDiscoveryProgress,
        learningPackProgress,
        earnedBadges,
      };
    } catch (error) {
      if (error instanceof CloudTransportError) throw error;
      throw new CloudTransportError(normalizeFirestoreError(error));
    }
  }

  async upsertExplorer(familyId: FamilyId, value: CloudExplorerDto): Promise<CloudSyncResult> {
    try {
      const reference = doc(
        this.firestore,
        explorerPath(familyId, parseExplorerId(value.explorerId)),
      );
      await runTransaction(this.firestore, async (transaction) => {
        const current = await transaction.get(reference);
        // Explorer look has no cross-device update timestamp. First valid write wins;
        // subsequent look changes remain local until a deliberate transport revision exists.
        if (!current.exists()) transaction.set(reference, value);
        else toExplorerDto(current.data());
      });
      return { state: 'success' };
    } catch (error) {
      return failed(error);
    }
  }

  async upsertDiscoveryProgress(
    familyId: FamilyId,
    value: CloudDiscoveryProgressDto,
  ): Promise<CloudSyncResult> {
    return this.mergeWrite(
      discoveryProgressPath(
        familyId,
        parseExplorerId(value.explorerId),
        parseDiscoveryId(value.discoveryId),
      ),
      value,
      toDiscoveryDto,
      (remote) =>
        toCloudDiscoveryProgressDto(
          mergeDiscoveryProgress(
            parseCloudDiscoveryProgressDto(remote),
            parseCloudDiscoveryProgressDto(value),
          ),
        ),
    );
  }

  async upsertPackDiscoveryProgress(
    familyId: FamilyId,
    value: CloudPackDiscoveryProgressDto,
  ): Promise<CloudSyncResult> {
    return this.mergeWrite(
      packDiscoveryProgressPath(
        familyId,
        parseExplorerId(value.explorerId),
        parseLearningPackId(value.learningPackId),
        parseDiscoveryId(value.discoveryId),
      ),
      value,
      toPackDiscoveryDto,
      (remote) =>
        toCloudPackDiscoveryProgressDto(
          mergePackDiscoveryProgress(
            parseCloudPackDiscoveryProgressDto(remote),
            parseCloudPackDiscoveryProgressDto(value),
          ),
        ),
    );
  }

  async upsertLearningPackProgress(
    familyId: FamilyId,
    value: CloudLearningPackProgressDto,
  ): Promise<CloudSyncResult> {
    return this.mergeWrite(
      learningPackProgressPath(
        familyId,
        parseExplorerId(value.explorerId),
        parseLearningPackId(value.learningPackId),
      ),
      value,
      toLearningPackDto,
      (remote) =>
        toCloudLearningPackProgressDto(
          mergeLearningPackProgress(
            parseCloudLearningPackProgressDto(remote),
            parseCloudLearningPackProgressDto(value),
          ),
        ),
    );
  }

  async upsertBadge(familyId: FamilyId, value: CloudEarnedBadgeDto): Promise<CloudSyncResult> {
    return this.mergeWrite(
      badgePath(familyId, parseExplorerId(value.explorerId), parseWorldId(value.worldId)),
      value,
      toBadgeDto,
      (remote) =>
        toCloudEarnedBadgeDto(
          mergeEarnedBadge(parseCloudEarnedBadgeDto(remote), parseCloudEarnedBadgeDto(value)),
        ),
    );
  }

  private async mergeWrite<T>(
    path: string,
    local: T,
    parseRemote: (value: unknown) => T,
    merge: (remote: T) => T,
  ): Promise<CloudSyncResult> {
    try {
      const reference = doc(this.firestore, path);
      await runTransaction(this.firestore, async (transaction) => {
        const current = await transaction.get(reference);
        transaction.set(
          reference,
          (current.exists() ? merge(parseRemote(current.data())) : local) as DocumentData,
        );
      });
      return { state: 'success' };
    } catch (error) {
      return failed(error);
    }
  }
}

function toFamilyDto(value: unknown): CloudFamilyDto {
  try {
    const family = parseCloudFamilyDto(value);
    return {
      familyId: family.id,
      createdAt: family.createdAt,
      schemaVersion: family.schemaVersion,
    };
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
function toFamilyMemberDto(value: unknown): CloudFamilyMemberDto {
  try {
    const member = parseCloudFamilyMemberDto(value);
    return {
      familyId: member.familyId,
      authUserId: member.authUserId,
      role: member.role,
      createdAt: member.createdAt,
      schemaVersion: 1,
    };
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
function toExplorerDto(value: unknown): CloudExplorerDto {
  try {
    const parsed = parseCloudExplorerDto(value);
    return { ...toCloudExplorerDto(parsed) };
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
function toDiscoveryDto(value: unknown): CloudDiscoveryProgressDto {
  try {
    return toCloudDiscoveryProgressDto(parseCloudDiscoveryProgressDto(value));
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
function toPackDiscoveryDto(value: unknown): CloudPackDiscoveryProgressDto {
  try {
    return toCloudPackDiscoveryProgressDto(parseCloudPackDiscoveryProgressDto(value));
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
function toLearningPackDto(value: unknown): CloudLearningPackProgressDto {
  try {
    return toCloudLearningPackProgressDto(parseCloudLearningPackProgressDto(value));
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
function toBadgeDto(value: unknown): CloudEarnedBadgeDto {
  try {
    return toCloudEarnedBadgeDto(parseCloudEarnedBadgeDto(value));
  } catch {
    throw new CloudTransportError('invalidRemoteData');
  }
}
