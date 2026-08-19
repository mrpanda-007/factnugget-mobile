import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { getLearningPackAccessService } from '../../../application/commerce/commerceRuntime';
import type { LearningPack, World } from '@app-types/domain/content';
import type { DiscoveryId } from '@app-types/domain/ids';

export type WorldStatus = 'not_started' | 'in_progress' | 'completed' | 'locked';

export interface WorldSummary {
  world: World;
  pack: LearningPack;
  discoveryCount: number;
  progress: number | undefined;
  discoveriesFound: number | undefined;
  locked: boolean;
  status: WorldStatus;
  lastViewedAt: string | null;
  nextDiscoveryId: DiscoveryId | null;
  nextDiscoveryTitle: string | null;
}

/** Joins the content catalogue to durable SQLite progress whenever Explore is
 * focused, so returning from a completed discovery immediately updates its hero. */
export function useWorldSummaries() {
  const generation = useRef(0);
  const [summaries, setSummaries] = useState<WorldSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const worlds = await liveContentRepository.listWorlds();
      const results = await Promise.all(
        worlds.map(async (world): Promise<WorldSummary | null> => {
          const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
          const pack = packs[0];
          if (!pack) return null;

          const access = await getLearningPackAccessService().getLearningPackAccess(pack.id);
          if (access.state !== 'allowed') {
            const packDiscoveries = await liveContentRepository.listPackDiscoveries(pack.id);
            return {
              world,
              pack,
              discoveryCount: packDiscoveries.length,
              progress: undefined,
              discoveriesFound: undefined,
              locked: true,
              status: 'locked',
              lastViewedAt: null,
              nextDiscoveryId: null,
              nextDiscoveryTitle: null,
            };
          }

          const [deckProgress, packDiscoveries, badge] = await Promise.all([
            ProgressRepository.getDeckProgress(pack.id),
            liveContentRepository.listPackDiscoveries(pack.id),
            ProgressRepository.getWorldBadge(world.id),
          ]);
          const discoveriesFound = deckProgress?.completedDiscoveryIds.length ?? 0;
          const completedIds = new Set(deckProgress?.completedDiscoveryIds ?? []);
          const nextDiscovery = packDiscoveries.find(
            ({ discovery }) => !completedIds.has(discovery.id),
          );
          const total = packDiscoveries.length;
          const status: WorldStatus = badge
            ? 'completed'
            : discoveriesFound > 0 || deckProgress
              ? 'in_progress'
              : 'not_started';
          return {
            world,
            pack,
            discoveryCount: total,
            progress: deckProgress ? discoveriesFound / total : undefined,
            discoveriesFound: deckProgress ? discoveriesFound : undefined,
            locked: false,
            status,
            lastViewedAt: deckProgress?.lastViewedAt ?? null,
            nextDiscoveryId: nextDiscovery?.discovery.id ?? null,
            nextDiscoveryTitle: nextDiscovery?.discovery.title ?? null,
          };
        }),
      );

      if (currentGeneration === generation.current) {
        setSummaries(results.filter((result): result is WorldSummary => result !== null));
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

  return { summaries, isLoading, loadFailed, refresh: load };
}
