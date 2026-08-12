import type { Discovery, LearningPack, PackDiscovery, World } from '../../types/domain/content';
import type { DiscoveryId, LearningPackId, WorldId } from '../../types/domain/ids';

export interface ContentRepositoryContract {
  listWorlds(): Promise<World[]>;
  getWorld(worldId: WorldId): Promise<World | null>;
  listLearningPacksForWorld(worldId: WorldId): Promise<LearningPack[]>;
  getLearningPack(learningPackId: LearningPackId): Promise<LearningPack | null>;
  listPackDiscoveries(learningPackId: LearningPackId): Promise<PackDiscovery[]>;
  getDiscovery(discoveryId: DiscoveryId): Promise<Discovery | null>;
}
