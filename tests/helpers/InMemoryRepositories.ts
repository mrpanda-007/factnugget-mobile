import type { ContentRepositoryContract } from '../../repositories/contracts/ContentRepositoryContract';
import type { ProgressRepositoryContract } from '../../repositories/contracts/ProgressRepositoryContract';
import type {
  Discovery,
  LearningPack,
  LearningPackDiscovery,
  PackDiscovery,
  World,
} from '../../types/domain/content';
import type {
  DiscoveryProgress,
  EarnedBadge,
  LearningPackProgress,
  PackDiscoveryProgress,
} from '../../types/domain/progress';
import type { DiscoveryId, ExplorerId, LearningPackId, WorldId } from '../../types/domain/ids';

export interface InMemoryContentSeed {
  worlds: World[];
  learningPacks: LearningPack[];
  discoveries: Discovery[];
  memberships: LearningPackDiscovery[];
}

export class InMemoryContentRepository implements ContentRepositoryContract {
  readonly worlds: World[];
  readonly learningPacks: LearningPack[];
  readonly discoveries: Discovery[];
  readonly memberships: LearningPackDiscovery[];

  constructor(seed: InMemoryContentSeed) {
    this.worlds = [...seed.worlds];
    this.learningPacks = [...seed.learningPacks];
    this.discoveries = [...seed.discoveries];
    this.memberships = [...seed.memberships];
  }

  async listWorlds(): Promise<World[]> {
    return [...this.worlds].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async getWorld(worldId: WorldId): Promise<World | null> {
    return this.worlds.find((world) => world.id === worldId) ?? null;
  }

  async listLearningPacksForWorld(worldId: WorldId): Promise<LearningPack[]> {
    return this.learningPacks
      .filter((pack) => pack.worldId === worldId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async getLearningPack(learningPackId: LearningPackId): Promise<LearningPack | null> {
    return this.learningPacks.find((pack) => pack.id === learningPackId) ?? null;
  }

  async listPackDiscoveries(learningPackId: LearningPackId): Promise<PackDiscovery[]> {
    return this.memberships
      .filter((membership) => membership.learningPackId === learningPackId)
      .sort((left, right) => left.position - right.position)
      .flatMap((membership) => {
        const discovery = this.discoveries.find((item) => item.id === membership.discoveryId);
        return discovery ? [{ membership, discovery }] : [];
      });
  }

  async getDiscovery(discoveryId: DiscoveryId): Promise<Discovery | null> {
    return this.discoveries.find((discovery) => discovery.id === discoveryId) ?? null;
  }
}

function discoveryKey(explorerId: ExplorerId, discoveryId: DiscoveryId): string {
  return `${explorerId}:${discoveryId}`;
}

function membershipKey(
  explorerId: ExplorerId,
  learningPackId: LearningPackId,
  discoveryId: DiscoveryId,
): string {
  return `${explorerId}:${learningPackId}:${discoveryId}`;
}

function packKey(explorerId: ExplorerId, learningPackId: LearningPackId): string {
  return `${explorerId}:${learningPackId}`;
}

function badgeKey(explorerId: ExplorerId, worldId: WorldId): string {
  return `${explorerId}:${worldId}`;
}

export class InMemoryProgressRepository implements ProgressRepositoryContract {
  private discoveryProgress = new Map<string, DiscoveryProgress>();
  private packDiscoveryProgress = new Map<string, PackDiscoveryProgress>();
  private learningPackProgress = new Map<string, LearningPackProgress>();
  private earnedBadges = new Map<string, EarnedBadge>();

  async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    const snapshot = {
      discovery: new Map(this.discoveryProgress),
      packDiscovery: new Map(this.packDiscoveryProgress),
      pack: new Map(this.learningPackProgress),
      badges: new Map(this.earnedBadges),
    };
    try {
      return await work();
    } catch (error) {
      this.discoveryProgress = snapshot.discovery;
      this.packDiscoveryProgress = snapshot.packDiscovery;
      this.learningPackProgress = snapshot.pack;
      this.earnedBadges = snapshot.badges;
      throw error;
    }
  }

  async getDiscoveryProgress(
    explorerId: ExplorerId,
    discoveryId: DiscoveryId,
  ): Promise<DiscoveryProgress | null> {
    return this.discoveryProgress.get(discoveryKey(explorerId, discoveryId)) ?? null;
  }

  async listCollectedDiscoveryIds(explorerId: ExplorerId): Promise<DiscoveryId[]> {
    return [...this.discoveryProgress.values()]
      .filter((progress) => progress.explorerId === explorerId && progress.collectedAt)
      .map((progress) => progress.discoveryId);
  }

  async markDiscoveryRevealed(write: {
    explorerId: ExplorerId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const key = discoveryKey(write.explorerId, write.discoveryId);
    const existing = this.discoveryProgress.get(key);
    if (existing?.revealedAt) return false;
    this.discoveryProgress.set(key, {
      explorerId: write.explorerId,
      discoveryId: write.discoveryId,
      revealedAt: write.occurredAt,
      collectedAt: existing?.collectedAt ?? null,
    });
    return true;
  }

  async collectDiscovery(write: {
    explorerId: ExplorerId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const key = discoveryKey(write.explorerId, write.discoveryId);
    const existing = this.discoveryProgress.get(key);
    if (existing?.collectedAt) return false;
    this.discoveryProgress.set(key, {
      explorerId: write.explorerId,
      discoveryId: write.discoveryId,
      revealedAt: existing?.revealedAt ?? write.occurredAt,
      collectedAt: write.occurredAt,
    });
    return true;
  }

  async getPackDiscoveryProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    discoveryId: DiscoveryId,
  ): Promise<PackDiscoveryProgress | null> {
    return (
      this.packDiscoveryProgress.get(membershipKey(explorerId, learningPackId, discoveryId)) ?? null
    );
  }

  async markPackDiscoveryRevealed(write: {
    explorerId: ExplorerId;
    learningPackId: LearningPackId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const key = membershipKey(write.explorerId, write.learningPackId, write.discoveryId);
    const existing = this.packDiscoveryProgress.get(key);
    if (existing?.revealedAt) return false;
    this.packDiscoveryProgress.set(key, {
      explorerId: write.explorerId,
      learningPackId: write.learningPackId,
      discoveryId: write.discoveryId,
      revealedAt: write.occurredAt,
      completedAt: existing?.completedAt ?? null,
    });
    return true;
  }

  async completePackDiscovery(write: {
    explorerId: ExplorerId;
    learningPackId: LearningPackId;
    discoveryId: DiscoveryId;
    occurredAt: string;
  }): Promise<boolean> {
    const key = membershipKey(write.explorerId, write.learningPackId, write.discoveryId);
    const existing = this.packDiscoveryProgress.get(key);
    if (existing?.completedAt) return false;
    this.packDiscoveryProgress.set(key, {
      explorerId: write.explorerId,
      learningPackId: write.learningPackId,
      discoveryId: write.discoveryId,
      revealedAt: existing?.revealedAt ?? write.occurredAt,
      completedAt: write.occurredAt,
    });
    return true;
  }

  async getLearningPackProgress(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
  ): Promise<LearningPackProgress | null> {
    return this.learningPackProgress.get(packKey(explorerId, learningPackId)) ?? null;
  }

  async startOrTouchLearningPack(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    occurredAt: string,
  ): Promise<void> {
    const key = packKey(explorerId, learningPackId);
    const existing = this.learningPackProgress.get(key);
    this.learningPackProgress.set(key, {
      explorerId,
      learningPackId,
      startedAt: existing?.startedAt ?? occurredAt,
      lastViewedAt: occurredAt,
      completedAt: existing?.completedAt ?? null,
      completionRevision: existing?.completionRevision ?? null,
    });
  }

  async completeLearningPack(
    explorerId: ExplorerId,
    learningPackId: LearningPackId,
    completionRevision: string,
    occurredAt: string,
  ): Promise<boolean> {
    const key = packKey(explorerId, learningPackId);
    const existing = this.learningPackProgress.get(key);
    if (existing?.completedAt) return false;
    this.learningPackProgress.set(key, {
      explorerId,
      learningPackId,
      startedAt: existing?.startedAt ?? occurredAt,
      lastViewedAt: occurredAt,
      completedAt: occurredAt,
      completionRevision,
    });
    return true;
  }

  async getEarnedBadge(explorerId: ExplorerId, worldId: WorldId): Promise<EarnedBadge | null> {
    return this.earnedBadges.get(badgeKey(explorerId, worldId)) ?? null;
  }

  async listEarnedBadges(explorerId: ExplorerId): Promise<EarnedBadge[]> {
    return [...this.earnedBadges.values()].filter((badge) => badge.explorerId === explorerId);
  }

  async earnWorldBadge(
    explorerId: ExplorerId,
    worldId: WorldId,
    contentRevision: string,
    occurredAt: string,
  ): Promise<boolean> {
    const key = badgeKey(explorerId, worldId);
    if (this.earnedBadges.has(key)) return false;
    this.earnedBadges.set(key, { explorerId, worldId, contentRevision, earnedAt: occurredAt });
    return true;
  }
}
