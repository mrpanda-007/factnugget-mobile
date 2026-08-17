import type { ContentRepositoryContract } from '../repositories/contracts/ContentRepositoryContract';
import type { ProgressRepositoryContract } from '../repositories/contracts/ProgressRepositoryContract';
import type { PackDiscovery } from '../types/domain/content';
import type { DiscoveryId, ExplorerId, LearningPackId, WorldId } from '../types/domain/ids';

export interface DiscoveryEncounterInput {
  explorerId: ExplorerId;
  learningPackId: LearningPackId;
  discoveryId: DiscoveryId;
}

export interface CollectDiscoveryResult {
  discoveryCollectedNow: boolean;
  packMembershipCompletedNow: boolean;
  learningPackCompletedNow: boolean;
  worldBadgeEarnedNow: boolean;
}

interface DiscoveryProgressServiceDependencies {
  content: ContentRepositoryContract;
  progress: ProgressRepositoryContract;
  now?: () => string;
}

interface TransactionalProgressRepository {
  withTransaction<T>(work: () => Promise<T>): Promise<T>;
}

/**
 * Owns the reveal → collect → Pack completion → World Badge transaction
 * semantics. Persistence implementations stay behind repository contracts.
 */
export class DiscoveryProgressService {
  private readonly content: ContentRepositoryContract;
  private readonly progress: ProgressRepositoryContract;
  private readonly now: () => string;

  constructor({
    content,
    progress,
    now = () => new Date().toISOString(),
  }: DiscoveryProgressServiceDependencies) {
    this.content = content;
    this.progress = progress;
    this.now = now;
  }

  async revealDiscovery(input: DiscoveryEncounterInput): Promise<void> {
    await this.requireMembership(input.learningPackId, input.discoveryId);
    const occurredAt = this.now();
    await this.inTransaction(async () => {
      await this.progress.startOrTouchLearningPack(
        input.explorerId,
        input.learningPackId,
        occurredAt,
      );
      await this.progress.markDiscoveryRevealed({
        explorerId: input.explorerId,
        discoveryId: input.discoveryId,
        occurredAt,
      });
      await this.progress.markPackDiscoveryRevealed({ ...input, occurredAt });
    });
  }

  async collectDiscovery(input: DiscoveryEncounterInput): Promise<CollectDiscoveryResult> {
    const pack = await this.content.getLearningPack(input.learningPackId);
    if (!pack) throw new Error(`Learning Pack not found: ${input.learningPackId}`);
    const packDiscoveries = await this.content.listPackDiscoveries(input.learningPackId);
    if (!packDiscoveries.some(({ membership }) => membership.discoveryId === input.discoveryId)) {
      throw new Error(
        `Discovery ${input.discoveryId} is not in Learning Pack ${input.learningPackId}.`,
      );
    }
    const world = await this.content.getWorld(pack.worldId);
    if (!world) throw new Error(`World not found: ${pack.worldId}`);
    const requiredPacks = (await this.content.listLearningPacksForWorld(pack.worldId)).filter(
      (candidate) => candidate.completionRole === 'required',
    );
    const requiredDiscoveries = packDiscoveries.filter(
      ({ membership }) => membership.completionRole === 'required',
    );

    const occurredAt = this.now();
    return this.inTransaction(async () => {
      await this.progress.startOrTouchLearningPack(
        input.explorerId,
        input.learningPackId,
        occurredAt,
      );
      await this.progress.markDiscoveryRevealed({
        explorerId: input.explorerId,
        discoveryId: input.discoveryId,
        occurredAt,
      });
      await this.progress.markPackDiscoveryRevealed({ ...input, occurredAt });
      const discoveryCollectedNow = await this.progress.collectDiscovery({
        explorerId: input.explorerId,
        discoveryId: input.discoveryId,
        occurredAt,
      });
      const packMembershipCompletedNow = await this.progress.completePackDiscovery({
        ...input,
        occurredAt,
      });
      const learningPackCompletedNow = await this.completePackWhenReady(
        input.explorerId,
        input.learningPackId,
        pack.revision,
        occurredAt,
        requiredDiscoveries,
      );
      const worldBadgeEarnedNow = await this.earnWorldBadgeWhenReady(
        input.explorerId,
        pack.worldId,
        world.revision,
        occurredAt,
        requiredPacks,
      );
      return {
        discoveryCollectedNow,
        packMembershipCompletedNow,
        learningPackCompletedNow,
        worldBadgeEarnedNow,
      };
    });
  }

  /** Resume is based on Pack membership, never on global collection state. */
  async getNextIncompleteDiscovery(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
  ): Promise<PackDiscovery | null> {
    const packDiscoveries = await this.content.listPackDiscoveries(learningPackId);
    for (const packDiscovery of packDiscoveries) {
      const progress = await this.progress.getPackDiscoveryProgress(
        explorerId,
        learningPackId,
        packDiscovery.discovery.id,
      );
      if (!progress?.completedAt) return packDiscovery;
    }
    return null;
  }

  private async requireMembership(
    learningPackId: LearningPackId,
    discoveryId: DiscoveryId,
  ): Promise<PackDiscovery> {
    const match = (await this.content.listPackDiscoveries(learningPackId)).find(
      ({ membership }) => membership.discoveryId === discoveryId,
    );
    if (!match) {
      throw new Error(`Discovery ${discoveryId} is not in Learning Pack ${learningPackId}.`);
    }
    return match;
  }

  private async completePackWhenReady(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    completionRevision: string,
    occurredAt: string,
    required: PackDiscovery[],
  ): Promise<boolean> {
    for (const { discovery } of required) {
      const progress = await this.progress.getPackDiscoveryProgress(
        explorerId,
        learningPackId,
        discovery.id,
      );
      if (!progress?.completedAt) return false;
    }

    return this.progress.completeLearningPack(
      explorerId,
      learningPackId,
      completionRevision,
      occurredAt,
    );
  }

  private async earnWorldBadgeWhenReady(
    explorerId: ExplorerId,
    worldId: WorldId,
    contentRevision: string,
    occurredAt: string,
    requiredPacks: Awaited<ReturnType<ContentRepositoryContract['listLearningPacksForWorld']>>,
  ): Promise<boolean> {
    // Historical completion is durable even when current content gains new requirements.
    if (await this.progress.getEarnedBadge(explorerId, worldId)) return false;

    for (const pack of requiredPacks) {
      const progress = await this.progress.getLearningPackProgress(explorerId, pack.id);
      if (!progress?.completedAt) return false;
    }

    return this.progress.earnWorldBadge(explorerId, worldId, contentRevision, occurredAt);
  }

  private inTransaction<T>(work: () => Promise<T>): Promise<T> {
    const transactional = this.progress as ProgressRepositoryContract &
      Partial<TransactionalProgressRepository>;
    return transactional.withTransaction ? transactional.withTransaction(work) : work();
  }
}
