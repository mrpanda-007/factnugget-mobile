import type { Discovery } from '@app-types/Discovery';
import type { CollectedDiscovery } from '@app-types/Progress';
import type { WorldId } from '@constants/tokens';

export type TreeGrowthStage = 'sapling' | 'young' | 'growing' | 'mature' | 'grand';
export type CollectibleMotion = 'hanging' | 'perched' | 'leaf' | 'static';

export type TreeCollectible = {
  id: string;
  title: string;
  category: WorldId;
  collectedAt: string;
  emoji: string;
  funFact: string;
  anchorId: string;
  motion: CollectibleMotion;
  /** Filled by the scene from the named branch anchor when the artifact gains
   * a physical presentation. It is intentionally not persisted progress data. */
  position?: [number, number, number];
};

export type TreeBranch = {
  id: string;
  worldId: WorldId;
  title: string;
  discoveryCount: number;
  anchor: [number, number, number];
  color: string;
  accent: string;
  collectibles: TreeCollectible[];
};

/** Named, stable spatial anchors. A production GLB will keep these IDs and
 * replace only the underlying procedural development mesh. */
export const treeBranchAnchors: Record<
  WorldId,
  { anchor: [number, number, number]; color: string; accent: string; title: string }
> = {
  dinosaur: {
    anchor: [-2.15, 3.45, 0.25],
    color: '#789A58',
    accent: '#E4A94E',
    title: 'Dinosaur Giants',
  },
  ocean: {
    anchor: [1.9, 3.95, 0.65],
    color: '#5C9FB1',
    accent: '#B8E2DF',
    title: 'Ocean Wonders',
  },
  space: {
    anchor: [0.55, 5.15, -1.6],
    color: '#7B6AA5',
    accent: '#F1CF79',
    title: 'Space Explorers',
  },
  animal: {
    anchor: [2.3, 2.6, -1.05],
    color: '#A78D58',
    accent: '#E9D28D',
    title: 'Animal Trails',
  },
  earth: {
    anchor: [-1.5, 2.35, -1.55],
    color: '#78957C',
    accent: '#B9D1AA',
    title: 'Earth Journeys',
  },
};

const stageThresholds: { stage: TreeGrowthStage; minimumDiscoveries: number }[] = [
  { stage: 'grand', minimumDiscoveries: 24 },
  { stage: 'mature', minimumDiscoveries: 14 },
  { stage: 'growing', minimumDiscoveries: 7 },
  { stage: 'young', minimumDiscoveries: 1 },
  { stage: 'sapling', minimumDiscoveries: 0 },
];

export function getTreeGrowthStage(discoveryCount: number): TreeGrowthStage {
  return (
    stageThresholds.find(({ minimumDiscoveries }) => discoveryCount >= minimumDiscoveries)?.stage ??
    'sapling'
  );
}

export function createTreeBranches(
  discoveries: Discovery[],
  collected: CollectedDiscovery[],
): TreeBranch[] {
  const collectedById = new Map(collected.map((item) => [item.discoveryId, item]));
  const grouped = new Map<WorldId, TreeCollectible[]>();

  discoveries.forEach((discovery) => {
    const progress = collectedById.get(discovery.id);
    if (!progress) return;
    const current = grouped.get(discovery.category) ?? [];
    current.push({
      id: discovery.id,
      title: discovery.title,
      category: discovery.category,
      collectedAt: progress.collectedAt,
      emoji: discovery.emoji,
      funFact: discovery.funFact,
      anchorId: `${discovery.category}-${current.length}`,
      motion: current.length % 3 === 0 ? 'hanging' : current.length % 3 === 1 ? 'perched' : 'leaf',
    });
    grouped.set(discovery.category, current);
  });

  return Array.from(grouped.entries()).map(([worldId, worldDiscoveries]) => {
    const presentation = treeBranchAnchors[worldId];
    return {
      id: `${worldId}-branch`,
      worldId,
      title: presentation.title,
      discoveryCount: worldDiscoveries.length,
      anchor: presentation.anchor,
      color: presentation.color,
      accent: presentation.accent,
      collectibles: worldDiscoveries,
    };
  });
}
