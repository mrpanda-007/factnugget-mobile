import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { getLearningPackAccessService } from '../../../application/commerce/commerceRuntime';
import type { ContentImage } from '@app-types/domain/content';
import {
  parseDiscoveryId,
  type DiscoveryId,
  type LearningPackId,
  type WorldId,
} from '@app-types/domain/ids';

export interface ParentRecentDiscovery {
  id: DiscoveryId;
  title: string;
  headlineFact: string;
  fallbackEmoji: string;
  images: ContentImage[];
  worldId: WorldId;
  collectedAt: string;
}

export interface ParentBadgeSummary {
  worldId: WorldId;
  worldTitle: string;
  title: string;
  icon: string;
  earnedAt: string;
}

export interface ParentPackSummary {
  packId: LearningPackId;
  title: string;
  discoveryCount: number;
}

interface ParentProgress {
  discoveriesFound: number;
  completedWorlds: number;
  badgesEarned: number;
  recentDiscoveries: ParentRecentDiscovery[];
  badges: ParentBadgeSummary[];
  lockedPacks: ParentPackSummary[];
}

const emptyProgress: ParentProgress = {
  discoveriesFound: 0,
  completedWorlds: 0,
  badgesEarned: 0,
  recentDiscoveries: [],
  badges: [],
  lockedPacks: [],
};

/**
 * Parent-only, read-only view of the child&apos;s existing progress. It deliberately
 * derives badge evidence from `completedAt`, the durable completion marker used
 * by Phase 3, rather than inferring a new reward from discovery counts.
 */
export function useParentProgress() {
  const generation = useRef(0);
  const [progress, setProgress] = useState<ParentProgress>(emptyProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;
    setIsLoading(true);
    setLoadFailed(false);

    try {
      const worlds = await liveContentRepository.listWorlds();
      const worldPacks = await Promise.all(
        worlds.map(async (world) => ({
          world,
          packs: await liveContentRepository.listLearningPacksForWorld(world.id),
        })),
      );

      const packEntries = worldPacks.flatMap(({ world, packs }) =>
        packs.map((pack) => ({ world, pack })),
      );
      const packContent = await Promise.all(
        packEntries.map(async ({ world, pack }) => ({
          world,
          pack,
          packDiscoveries: await liveContentRepository.listPackDiscoveries(pack.id),
        })),
      );

      const lockedPackIds = new Set(
        (
          await Promise.all(
            packContent.map(async ({ pack }) => {
              const access = await getLearningPackAccessService().getLearningPackAccess(pack.id);
              return access.state === 'allowed' ? null : pack.id;
            }),
          )
        ).filter((packId): packId is LearningPackId => packId !== null),
      );

      const [collected, earnedBadges] = await Promise.all([
        ProgressRepository.getCollection(),
        ProgressRepository.getEarnedBadges(),
      ]);

      const discoveryById = new Map(
        packContent.flatMap(({ world, packDiscoveries }) =>
          packDiscoveries.map(
            ({ discovery }) => [discovery.id, { discovery, worldId: world.id }] as const,
          ),
        ),
      );
      const badgeByWorldId = new Map(earnedBadges.map((badge) => [badge.worldId, badge]));

      const recentDiscoveries = collected
        .map(({ discoveryId, collectedAt }) => {
          const entry = discoveryById.get(parseDiscoveryId(discoveryId));
          return entry
            ? {
                id: entry.discovery.id,
                title: entry.discovery.title,
                headlineFact: entry.discovery.headlineFact,
                fallbackEmoji: entry.discovery.fallbackEmoji,
                images: entry.discovery.images,
                worldId: entry.worldId,
                collectedAt,
              }
            : null;
        })
        .filter((discovery): discovery is ParentRecentDiscovery => discovery !== null)
        .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt))
        .slice(0, 4);

      const worldById = new Map(worlds.map((world) => [world.id, world]));
      const badges = [...badgeByWorldId.entries()]
        .map(([worldId, badge]): ParentBadgeSummary | null => {
          const world = worldById.get(worldId);
          return world
            ? {
                worldId: world.id,
                worldTitle: world.title,
                title: world.badge.title,
                icon: world.badge.icon,
                earnedAt: badge.earnedAt,
              }
            : null;
        })
        .filter((badge): badge is ParentBadgeSummary => badge !== null)
        .sort((left, right) => right.earnedAt.localeCompare(left.earnedAt));

      if (currentGeneration === generation.current) {
        setProgress({
          discoveriesFound: collected.length,
          completedWorlds: badges.length,
          badgesEarned: badges.length,
          recentDiscoveries,
          badges,
          lockedPacks: packContent
            .filter(({ pack }) => lockedPackIds.has(pack.id))
            .map(({ pack, packDiscoveries }) => ({
              packId: pack.id,
              title: pack.title,
              discoveryCount: packDiscoveries.length,
            })),
        });
        setIsLoading(false);
      }
    } catch {
      if (currentGeneration === generation.current) {
        setLoadFailed(true);
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        generation.current += 1;
      };
    }, [load]),
  );

  return { progress, isLoading, loadFailed, refresh: load };
}
