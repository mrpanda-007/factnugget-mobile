import {
  parseCloudDiscoveryProgressDto,
  parseCloudEarnedBadgeDto,
  parseCloudExplorerDto,
  parseCloudLearningPackProgressDto,
  parseCloudPackDiscoveryProgressDto,
} from './cloudDtoMappers';
import {
  CloudTransportError,
  normalizeFirestoreError,
} from '@repositories/adapters/FirestoreCloudSyncRepository';
import type {
  RemoteExplorerImportError,
  RemoteExplorerImportResult,
  RemoteExplorerSummary,
} from '@app-types/domain/cloud';
import type { ExplorerId } from '@app-types/domain/ids';
import type { SQLiteCloudSyncStateRepository } from '@repositories/adapters/SQLiteCloudSyncStateRepository';
import type { CloudAccountBindingRepositoryContract } from '@repositories/contracts/CloudAccountBindingRepositoryContract';
import type { CloudSyncRepositoryContract } from '@repositories/contracts/CloudSyncRepositoryContract';

import type { ParentSessionReader } from './CloudSyncService';

function normalize(error: unknown): RemoteExplorerImportError {
  const value =
    error instanceof CloudTransportError ? error.syncError : normalizeFirestoreError(error);
  switch (value) {
    case 'authRequired':
      return 'authRequired';
    case 'bindingMismatch':
      return 'bindingMismatch';
    case 'permissionDenied':
      return 'permissionDenied';
    case 'offline':
    case 'unavailable':
      return 'networkUnavailable';
    case 'invalidRemoteData':
      return 'invalidRemoteData';
    case 'notFound':
      return 'notFound';
    default:
      return 'unknownFailure';
  }
}

/** Validates the complete remote snapshot before one local SQLite transaction, without an echo queue. */
export class RemoteExplorerImportService {
  constructor(
    private readonly dependencies: {
      bindings: CloudAccountBindingRepositoryContract;
      cloud: CloudSyncRepositoryContract | null;
      localState: SQLiteCloudSyncStateRepository;
      session: ParentSessionReader;
    },
  ) {}

  async listAvailable(): Promise<RemoteExplorerSummary[] | { error: RemoteExplorerImportError }> {
    const context = await this.getContext();
    if ('error' in context) return { error: context.error };
    try {
      const explorers = await this.dependencies.cloud!.listFamilyExplorers(context.familyId);
      return explorers
        .map((value) => parseCloudExplorerDto(value))
        .map((value) => ({
          explorerId: value.id,
          lookId: value.lookId,
          createdAt: value.createdAt,
        }))
        .sort((left, right) => left.explorerId.localeCompare(right.explorerId));
    } catch (error) {
      return { error: normalize(error) };
    }
  }

  async importExplorer(explorerId: ExplorerId): Promise<RemoteExplorerImportResult> {
    const context = await this.getContext();
    if ('error' in context) return { state: 'failure', error: context.error };
    try {
      const summaries = await this.dependencies.cloud!.listFamilyExplorers(context.familyId);
      const selected = summaries.find((value) => value.explorerId === explorerId);
      if (!selected) return { state: 'failure', error: 'notFound' };
      const snapshot = await this.dependencies.cloud!.pullExplorerState(context.familyId, selected);
      if (!snapshot) return { state: 'failure', error: 'notFound' };
      // Re-parse every DTO before any SQLite write. Remote adapter validation is defense in depth.
      let explorer;
      let discovery;
      let packDiscovery;
      let learningPacks;
      let badges;
      try {
        explorer = parseCloudExplorerDto(snapshot.explorer);
        discovery = snapshot.discoveryProgress.map(parseCloudDiscoveryProgressDto);
        packDiscovery = snapshot.packDiscoveryProgress.map(parseCloudPackDiscoveryProgressDto);
        learningPacks = snapshot.learningPackProgress.map(parseCloudLearningPackProgressDto);
        badges = snapshot.earnedBadges.map(parseCloudEarnedBadgeDto);
      } catch {
        return { state: 'failure', error: 'invalidRemoteData' };
      }
      if (explorer.id !== explorerId) return { state: 'failure', error: 'invalidRemoteData' };
      if (
        [...discovery, ...packDiscovery, ...learningPacks, ...badges].some(
          (value) => value.explorerId !== explorerId,
        )
      ) {
        return { state: 'failure', error: 'invalidRemoteData' };
      }
      const alreadyLocal = Boolean(await this.dependencies.localState.getExplorer(explorerId));
      await this.dependencies.localState.withTransaction(async () => {
        await this.dependencies.localState.applyExplorer(explorer);
        for (const value of discovery) await this.dependencies.localState.applyDiscovery(value);
        for (const value of packDiscovery)
          await this.dependencies.localState.applyPackDiscovery(value);
        for (const value of learningPacks)
          await this.dependencies.localState.applyLearningPack(value);
        for (const value of badges) await this.dependencies.localState.applyBadge(value);
      });
      return { state: 'success', explorerId, mergedExisting: alreadyLocal };
    } catch (error) {
      return { state: 'failure', error: normalize(error) };
    }
  }

  async makeImportedExplorerActive(explorerId: ExplorerId): Promise<RemoteExplorerImportResult> {
    const explorer = await this.dependencies.localState.getExplorer(explorerId);
    if (!explorer) return { state: 'failure', error: 'notFound' };
    try {
      await this.dependencies.localState.setActiveExplorer(explorerId);
      return { state: 'success', explorerId, mergedExisting: true };
    } catch {
      return { state: 'failure', error: 'unknownFailure' };
    }
  }

  private async getContext(): Promise<
    { familyId: import('@app-types/domain/ids').FamilyId } | { error: RemoteExplorerImportError }
  > {
    if (!this.dependencies.cloud) return { error: 'networkUnavailable' };
    const [binding, session] = await Promise.all([
      this.dependencies.bindings.getCurrentBinding(),
      this.dependencies.session.getSession(),
    ]);
    if (binding.state !== 'bound') return { error: 'familyMismatch' };
    if (!session) return { error: 'authRequired' };
    if (session.authUserId !== binding.authUserId) return { error: 'bindingMismatch' };
    try {
      const membership = await this.dependencies.cloud.getFamilyMembership(
        binding.familyId,
        session.authUserId,
      );
      if (
        !membership ||
        membership.familyId !== binding.familyId ||
        membership.authUserId !== session.authUserId ||
        membership.role !== 'parent'
      ) {
        return { error: 'familyMismatch' };
      }
      return { familyId: binding.familyId };
    } catch (error) {
      return { error: normalize(error) };
    }
  }
}
