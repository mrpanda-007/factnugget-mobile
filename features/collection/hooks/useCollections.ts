import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { getLearningPackAccessService } from '../../../application/commerce/commerceRuntime';
import { parseDiscoveryId } from '@app-types/domain/ids';
import type { CollectedDiscovery } from '@app-types/Progress';
import type { CollectionsState, ExplorerCollection } from '@features/collection/types';

const initialState: CollectionsState = {
  collections: [],
  featured: null,
  totalDiscovered: 0,
  totalAvailable: 0,
  newestDiscoveryId: null,
  isLoading: true,
  loadFailed: false,
};

let collectionIdsSeenThisSession: Set<string> | null = null;

function newestUnseen(collection: CollectedDiscovery[]) {
  const seen = collectionIdsSeenThisSession ?? new Set<string>();
  const newest = [...collection]
    .filter((item) => !seen.has(item.discoveryId))
    .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt))[0]?.discoveryId;
  return newest ? parseDiscoveryId(newest) : null;
}

function featuredCollection(collections: ExplorerCollection[], recentPackId: string | null) {
  return (
    collections.find((item) => item.pack.id === recentPackId && item.status !== 'locked') ??
    collections.find((item) => item.status === 'in_progress') ??
    collections.find((item) => item.status === 'completed') ??
    collections.find((item) => item.status !== 'locked') ??
    collections[0] ??
    null
  );
}

export function useCollections() {
  const generation = useRef(0);
  const [state, setState] = useState<CollectionsState>(initialState);

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;
    setState((current) => ({ ...current, isLoading: true, loadFailed: false }));

    try {
      const [worlds, collected, recentPackId] = await Promise.all([
        liveContentRepository.listWorlds(),
        ProgressRepository.getCollection(),
        ProgressRepository.getMostRecentlyActiveDeckId(),
      ]);
      const collectedById = new Map(collected.map((item) => [item.discoveryId, item.collectedAt]));

      const nested = await Promise.all(
        worlds.map(async (world) => {
          const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
          return Promise.all(
            packs.map(async (pack): Promise<ExplorerCollection> => {
              const access = await getLearningPackAccessService().getLearningPackAccess(pack.id);
              const locked = access.state !== 'allowed';
              const [packDiscoveries, progress, badge] = await Promise.all([
                liveContentRepository.listPackDiscoveries(pack.id),
                locked ? Promise.resolve(null) : ProgressRepository.getDeckProgress(pack.id),
                locked ? Promise.resolve(null) : ProgressRepository.getWorldBadge(world.id),
              ]);
              const discoveries = packDiscoveries.map(({ discovery }) => discovery);
              const discoveredIds = new Set(
                discoveries.filter((item) => collectedById.has(item.id)).map((item) => item.id),
              );
              const collectedItems = discoveries
                .filter((item) => discoveredIds.has(item.id))
                .map((discovery) => ({
                  discovery,
                  collectedAt: collectedById.get(discovery.id)!,
                }));
              const totalCount = discoveries.length;
              const discoveredCount = discoveredIds.size;
              const status = locked
                ? 'locked'
                : badge
                  ? 'completed'
                  : discoveredCount > 0
                    ? 'in_progress'
                    : 'not_started';

              return {
                id: pack.id,
                world,
                pack,
                discoveries,
                collectedItems,
                discoveredIds,
                discoveredCount,
                totalCount,
                progress: totalCount ? discoveredCount / totalCount : 0,
                status,
                lastViewedAt: progress?.lastViewedAt ?? null,
                badgeEarnedAt: badge?.earnedAt ?? null,
              };
            }),
          );
        }),
      );

      if (currentGeneration !== generation.current) return;
      const collections = nested.flat().sort((left, right) => {
        if (left.status === 'locked' && right.status !== 'locked') return 1;
        if (left.status !== 'locked' && right.status === 'locked') return -1;
        return left.pack.sortOrder - right.pack.sortOrder;
      });
      const newestDiscoveryId = newestUnseen(collected);
      collectionIdsSeenThisSession = new Set(collectedById.keys());

      setState({
        collections,
        featured: featuredCollection(collections, recentPackId),
        totalDiscovered: collectedById.size,
        totalAvailable: collections.reduce((sum, item) => sum + item.totalCount, 0),
        newestDiscoveryId,
        isLoading: false,
        loadFailed: false,
      });
    } catch {
      if (currentGeneration === generation.current) {
        setState((current) => ({ ...current, isLoading: false, loadFailed: true }));
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

  return { ...state, refresh: load };
}
