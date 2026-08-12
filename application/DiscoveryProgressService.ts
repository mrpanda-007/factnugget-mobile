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
  }

  async collectDiscovery(input: DiscoveryEncounterInput): Promise<CollectDiscoveryResult> {
    const pack = await this.content.getLearningPack(input.learningPackId);
    if (!pack) throw new Error(`Learning Pack not found: ${input.learningPackId}`);
    await this.requireMembership(input.learningPackId, input.discoveryId);

    const occurredAt = this.now();
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
    );
    const worldBadgeEarnedNow = await this.earnWorldBadgeWhenReady(
      input.explorerId,
      pack.worldId,
      occurredAt,
    );

    return {
      discoveryCollectedNow,
      packMembershipCompletedNow,
      learningPackCompletedNow,
      worldBadgeEarnedNow,
    };
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
  ): Promise<boolean> {
    const required = (await this.content.listPackDiscoveries(learningPackId)).filter(
      ({ membership }) => membership.completionRole === 'required',
    );

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
    occurredAt: string,
  ): Promise<boolean> {
    // Historical completion is durable even when current content gains new requirements.
    if (await this.progress.getEarnedBadge(explorerId, worldId)) return false;

    const world = await this.content.getWorld(worldId);
    if (!world) throw new Error(`World not found: ${worldId}`);
    const requiredPacks = (await this.content.listLearningPacksForWorld(worldId)).filter(
      (pack) => pack.completionRole === 'required',
    );

    for (const pack of requiredPacks) {
      const progress = await this.progress.getLearningPackProgress(explorerId, pack.id);
      if (!progress?.completedAt) return false;
    }

    return this.progress.earnWorldBadge(explorerId, worldId, world.revision, occurredAt);
  }
}
