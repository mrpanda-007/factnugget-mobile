import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
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
  return (
    [...collection]
      .filter((item) => !seen.has(item.discoveryId))
      .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt))[0]?.discoveryId ??
    null
  );
}

function featuredCollection(collections: ExplorerCollection[], recentDeckId: string | null) {
  return (
    collections.find((item) => item.deck.id === recentDeckId && item.status !== 'locked') ??
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
      const [categories, collected, recentDeckId] = await Promise.all([
        ContentRepository.getCategories(),
        ProgressRepository.getCollection(),
        ProgressRepository.getMostRecentlyActiveDeckId(),
      ]);
      const collectedById = new Map(collected.map((item) => [item.discoveryId, item.collectedAt]));

      const nested = await Promise.all(
        categories.map(async (category) => {
          const decks = await ContentRepository.getDecksForCategory(category.id);
          return Promise.all(
            decks.map(async (deck): Promise<ExplorerCollection> => {
              const [discoveries, progress, badge] = await Promise.all([
                ContentRepository.getDiscoveriesForDeck(deck.id),
                ProgressRepository.getDeckProgress(deck.id),
                ProgressRepository.getWorldBadge(category.id),
              ]);
              const discoveredIds = new Set(
                discoveries.filter((item) => collectedById.has(item.id)).map((item) => item.id),
              );
              const collectedItems = discoveries
                .filter((item) => discoveredIds.has(item.id))
                .map((discovery) => ({
                  discovery,
                  collectedAt: collectedById.get(discovery.id)!,
                }));
              const totalCount = Math.max(deck.discoveryIds.length, discoveries.length);
              const discoveredCount = discoveredIds.size;
              const status = !deck.isFree
                ? 'locked'
                : badge
                  ? 'completed'
                  : discoveredCount > 0
                    ? 'in_progress'
                    : 'not_started';

              return {
                id: deck.id,
                category,
                deck,
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
        return left.deck.displayOrder - right.deck.displayOrder;
      });
      const newestDiscoveryId = newestUnseen(collected);
      collectionIdsSeenThisSession = new Set(collectedById.keys());

      setState({
        collections,
        featured: featuredCollection(collections, recentDeckId),
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
