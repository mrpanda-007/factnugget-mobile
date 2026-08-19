import type { ContentRepositoryContract } from '@repositories/contracts/ContentRepositoryContract';
import type { Discovery, LearningPack, PackDiscovery, World } from '@app-types/domain/content';
import type { DiscoveryId, LearningPackId, WorldId } from '@app-types/domain/ids';

import type { ContentSnapshot } from './contentSnapshot';

/**
 * Serves ContentRepositoryContract reads from a single validated, in-memory
 * ContentSnapshot. Retired content is excluded from every listing and lookup —
 * identical to LegacyContentRepositoryAdapter's published-only behaviour — so
 * swapping which repository is active never changes what a screen can see.
 *
 * Historical SQLite progress is untouched by any of this: retiring a Discovery
 * removes it from here, never from discovery_progress/earned_badges.
 */
export class SnapshotContentRepository implements ContentRepositoryContract {
  constructor(private readonly getSnapshot: () => ContentSnapshot) {}

  async listWorlds(): Promise<World[]> {
    return this.snapshot()
      .worlds.filter((world) => world.lifecycle === 'published')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getWorld(worldId: WorldId): Promise<World | null> {
    const world = this.snapshot().worlds.find((candidate) => candidate.id === worldId);
    return world && world.lifecycle === 'published' ? world : null;
  }

  async listLearningPacksForWorld(worldId: WorldId): Promise<LearningPack[]> {
    return this.snapshot()
      .learningPacks.filter((pack) => pack.worldId === worldId && pack.lifecycle === 'published')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getLearningPack(learningPackId: LearningPackId): Promise<LearningPack | null> {
    const pack = this.snapshot().learningPacks.find((candidate) => candidate.id === learningPackId);
    return pack && pack.lifecycle === 'published' ? pack : null;
  }

  async listPackDiscoveries(learningPackId: LearningPackId): Promise<PackDiscovery[]> {
    const snapshot = this.snapshot();
    const discoveriesById = new Map(
      snapshot.discoveries.map((discovery) => [discovery.id, discovery]),
    );
    return snapshot.packMemberships
      .filter((membership) => membership.learningPackId === learningPackId)
      .sort((a, b) => a.position - b.position)
      .flatMap((membership) => {
        const discovery = discoveriesById.get(membership.discoveryId);
        if (!discovery || discovery.lifecycle !== 'published') return [];
        return [{ membership, discovery }];
      });
  }

  async getDiscovery(discoveryId: DiscoveryId): Promise<Discovery | null> {
    const discovery = this.snapshot().discoveries.find((candidate) => candidate.id === discoveryId);
    return discovery && discovery.lifecycle === 'published' ? discovery : null;
  }

  private snapshot(): ContentSnapshot {
    return this.getSnapshot();
  }
}
