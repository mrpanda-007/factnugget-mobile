import {
  parseCloudDiscoveryProgressDto,
  parseCloudEarnedBadgeDto,
  parseCloudLearningPackProgressDto,
  parseCloudPackDiscoveryProgressDto,
  toCloudDiscoveryProgressDto,
  toCloudEarnedBadgeDto,
  toCloudExplorerDto,
  toCloudLearningPackProgressDto,
  toCloudPackDiscoveryProgressDto,
} from './cloudDtoMappers';
import { CloudTransportError } from '../../repositories/adapters/FirestoreCloudSyncRepository';
import {
  mergeDiscoveryProgress,
  mergeEarnedBadge,
  mergeLearningPackProgress,
  mergePackDiscoveryProgress,
} from './merge/progressMerge';
import type { CloudSyncResult, ParentAuthSession, SyncOperation } from '@app-types/domain/cloud';
import type { ExplorerId } from '@app-types/domain/ids';
import type { CloudAccountBindingRepositoryContract } from '@repositories/contracts/CloudAccountBindingRepositoryContract';
import type { CloudSyncRepositoryContract } from '@repositories/contracts/CloudSyncRepositoryContract';
import type { SyncOutboxRepositoryContract } from '@repositories/contracts/SyncOutboxRepositoryContract';
import type { SQLiteCloudSyncStateRepository } from '@repositories/adapters/SQLiteCloudSyncStateRepository';

export interface ParentSessionReader {
  getSession(): Promise<ParentAuthSession | null>;
}

interface CloudSyncServiceDependencies {
  bindings: CloudAccountBindingRepositoryContract;
  outbox: SyncOutboxRepositoryContract;
  localState: SQLiteCloudSyncStateRepository;
  cloud: CloudSyncRepositoryContract | null;
  session: ParentSessionReader;
  now?: () => string;
  batchSize?: number;
}

/** Explicit local-first reconciliation. It has no listener, timer, or UI dependency. */
export class CloudSyncService {
  private readonly now: () => string;
  private readonly batchSize: number;
  private inFlight: Promise<CloudSyncResult> | null = null;

  constructor(private readonly dependencies: CloudSyncServiceDependencies) {
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.batchSize = dependencies.batchSize ?? 50;
  }

  syncNow(explorerId: ExplorerId): Promise<CloudSyncResult> {
    if (!this.inFlight) {
      this.inFlight = this.sync(explorerId).finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  async pushPending(): Promise<CloudSyncResult> {
    const context = await this.getContext();
    if ('error' in context) return context.error;
    const pending = await this.dependencies.outbox.listPending(context.familyId, this.batchSize);
    let pushed = 0;
    let failure: CloudSyncResult | null = null;
    for (const operation of pending) {
      const result = await this.deliver(context.familyId, operation);
      if (result.state === 'success') {
        pushed += 1;
        continue;
      }
      failure = result;
    }
    const remainingPending = await this.dependencies.outbox.countPending(context.familyId);
    return failure
      ? {
          state: pushed > 0 ? 'partial' : 'failure',
          error: failure.error,
          pushed,
          remainingPending,
        }
      : { state: 'success', pushed, remainingPending };
  }

  async pullExplorer(explorerId: ExplorerId): Promise<CloudSyncResult> {
    const context = await this.getContext();
    if ('error' in context) return context.error;
    const explorer = await this.dependencies.localState.getExplorer(explorerId);
    if (!explorer) return { state: 'failure', error: 'notFound' };
    try {
      const remote = await this.dependencies.cloud!.pullExplorerState(
        context.familyId,
        toCloudExplorerDto(explorer),
      );
      if (!remote) return { state: 'success', pulled: 0, merged: 0 };
      let merged = 0;
      await this.dependencies.localState.withTransaction(async () => {
        for (const dto of remote.discoveryProgress) {
          const remoteValue = parseCloudDiscoveryProgressDto(dto);
          const local = await this.getLocalEntity(
            context.familyId,
            'discoveryProgress',
            `${explorerId}__${remoteValue.discoveryId}`,
          );
          await this.dependencies.localState.applyDiscovery(
            local?.entityType === 'discoveryProgress'
              ? mergeDiscoveryProgress(local.value, remoteValue)
              : remoteValue,
          );
          merged += 1;
        }
        for (const dto of remote.packDiscoveryProgress) {
          const remoteValue = parseCloudPackDiscoveryProgressDto(dto);
          const local = await this.getLocalEntity(
            context.familyId,
            'packDiscoveryProgress',
            `${explorerId}__${remoteValue.learningPackId}__${remoteValue.discoveryId}`,
          );
          await this.dependencies.localState.applyPackDiscovery(
            local?.entityType === 'packDiscoveryProgress'
              ? mergePackDiscoveryProgress(local.value, remoteValue)
              : remoteValue,
          );
          merged += 1;
        }
        for (const dto of remote.learningPackProgress) {
          const remoteValue = parseCloudLearningPackProgressDto(dto);
          const local = await this.getLocalEntity(
            context.familyId,
            'learningPackProgress',
            `${explorerId}__${remoteValue.learningPackId}`,
          );
          await this.dependencies.localState.applyLearningPack(
            local?.entityType === 'learningPackProgress'
              ? mergeLearningPackProgress(local.value, remoteValue)
              : remoteValue,
          );
          merged += 1;
        }
        for (const dto of remote.earnedBadges) {
          const remoteValue = parseCloudEarnedBadgeDto(dto);
          const local = await this.getLocalEntity(
            context.familyId,
            'earnedBadge',
            `${explorerId}__${remoteValue.worldId}`,
          );
          await this.dependencies.localState.applyBadge(
            local?.entityType === 'earnedBadge'
              ? mergeEarnedBadge(local.value, remoteValue)
              : remoteValue,
          );
          merged += 1;
        }
      });
      return { state: 'success', pulled: 1, merged };
    } catch (error) {
      return { state: 'failure', error: this.normalize(error) };
    }
  }

  private async sync(explorerId: ExplorerId): Promise<CloudSyncResult> {
    const push = await this.pushPending();
    if (
      push.state === 'failure' &&
      push.error !== 'notFound' &&
      push.error !== 'invalidLocalData'
    ) {
      return push;
    }
    const pull = await this.pullExplorer(explorerId);
    if (pull.state === 'success' && push.state === 'success') {
      return {
        state: 'success',
        pushed: push.pushed,
        pulled: pull.pulled,
        merged: pull.merged,
        remainingPending: push.remainingPending,
      };
    }
    const error =
      pull.state !== 'success'
        ? pull.error
        : push.state !== 'success'
          ? push.error
          : 'unknownFailure';
    return {
      state: 'partial',
      error,
      pushed: push.pushed,
      pulled: pull.pulled,
      merged: pull.merged,
      remainingPending: push.remainingPending,
    };
  }

  private async deliver(
    familyId: SyncOperation['familyId'],
    operation: SyncOperation,
  ): Promise<CloudSyncResult> {
    try {
      const entity = await this.dependencies.localState.getEntity(operation);
      if (!entity) return this.recordFailure(operation, 'invalidLocalData');
      let result: CloudSyncResult;
      switch (entity.entityType) {
        case 'explorer':
          result = await this.dependencies.cloud!.upsertExplorer(
            familyId,
            toCloudExplorerDto(entity.value),
          );
          break;
        case 'discoveryProgress':
          result = await this.dependencies.cloud!.upsertDiscoveryProgress(
            familyId,
            toCloudDiscoveryProgressDto(entity.value),
          );
          break;
        case 'packDiscoveryProgress':
          result = await this.dependencies.cloud!.upsertPackDiscoveryProgress(
            familyId,
            toCloudPackDiscoveryProgressDto(entity.value),
          );
          break;
        case 'learningPackProgress':
          result = await this.dependencies.cloud!.upsertLearningPackProgress(
            familyId,
            toCloudLearningPackProgressDto(entity.value),
          );
          break;
        case 'earnedBadge':
          result = await this.dependencies.cloud!.upsertBadge(
            familyId,
            toCloudEarnedBadgeDto(entity.value),
          );
          break;
      }
      if (result.state === 'success') {
        await this.dependencies.outbox.removeDelivered(operation.operationId);
        return result;
      }
      return this.recordFailure(operation, result.error);
    } catch (error) {
      return this.recordFailure(operation, this.normalize(error));
    }
  }

  private async getContext(): Promise<
    { familyId: SyncOperation['familyId'] } | { error: CloudSyncResult }
  > {
    if (!this.dependencies.cloud) return { error: { state: 'failure', error: 'unavailable' } };
    const binding = await this.dependencies.bindings.getCurrentBinding();
    if (binding.state !== 'bound') return { error: { state: 'failure', error: 'unbound' } };
    const session = await this.dependencies.session.getSession();
    if (!session) return { error: { state: 'failure', error: 'authRequired' } };
    if (session.authUserId !== binding.authUserId) {
      return { error: { state: 'failure', error: 'bindingMismatch' } };
    }
    try {
      const membership = await this.dependencies.cloud.getFamilyMembership(
        binding.familyId,
        session.authUserId,
      );
      if (
        !membership ||
        membership.familyId !== binding.familyId ||
        membership.authUserId !== session.authUserId
      ) {
        return { error: { state: 'failure', error: 'permissionDenied' } };
      }
    } catch (error) {
      return { error: { state: 'failure', error: this.normalize(error) } };
    }
    return { familyId: binding.familyId };
  }

  private async getLocalEntity(
    familyId: SyncOperation['familyId'],
    entityType: SyncOperation['entityType'],
    entityId: string,
  ) {
    return this.dependencies.localState.getEntity({
      operationId: 'remote-pull',
      familyId,
      entityType,
      entityId,
      operation: 'upsert',
      createdAt: this.now(),
      attemptCount: 0,
      lastAttemptAt: null,
      lastErrorCode: null,
    });
  }

  private async recordFailure(
    operation: SyncOperation,
    error: Exclude<CloudSyncResult, { state: 'success' }>['error'],
  ): Promise<CloudSyncResult> {
    await this.dependencies.outbox.recordAttemptFailure(operation.operationId, error, this.now());
    return { state: 'failure', error };
  }

  private normalize(error: unknown): Exclude<CloudSyncResult, { state: 'success' }>['error'] {
    return error instanceof CloudTransportError ? error.syncError : 'unknownFailure';
  }
}
