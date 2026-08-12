import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';

export type WorldStatus = 'not_started' | 'in_progress' | 'completed' | 'locked';

export interface WorldSummary {
  category: Category;
  deck: Deck;
  progress: number | undefined;
  discoveriesFound: number | undefined;
  locked: boolean;
  status: WorldStatus;
  lastViewedAt: string | null;
  nextDiscoveryId: string | null;
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
      const categories = await ContentRepository.getCategories();
      const results = await Promise.all(
        categories.map(async (category): Promise<WorldSummary | null> => {
          const decks = await ContentRepository.getDecksForCategory(category.id);
          const deck = decks[0];
          if (!deck) return null;

          if (!deck.isFree) {
            return {
              category,
              deck,
              progress: undefined,
              discoveriesFound: undefined,
              locked: true,
              status: 'locked',
              lastViewedAt: null,
              nextDiscoveryId: null,
              nextDiscoveryTitle: null,
            };
          }

          const [deckProgress, discoveries] = await Promise.all([
            ProgressRepository.getDeckProgress(deck.id),
            ContentRepository.getDiscoveriesForDeck(deck.id),
          ]);
          const discoveriesFound = deckProgress?.completedDiscoveryIds.length ?? 0;
          const completedIds = new Set(deckProgress?.completedDiscoveryIds ?? []);
          const nextDiscovery = discoveries.find((discovery) => !completedIds.has(discovery.id));
          const total = deck.discoveryIds.length;
          const status: WorldStatus =
            total > 0 && discoveriesFound >= total
              ? 'completed'
              : discoveriesFound > 0 || deckProgress
                ? 'in_progress'
                : 'not_started';
          return {
            category,
            deck,
            progress: deckProgress ? discoveriesFound / total : undefined,
            discoveriesFound: deckProgress ? discoveriesFound : undefined,
            locked: false,
            status,
            lastViewedAt: deckProgress?.lastViewedAt ?? null,
            nextDiscoveryId: nextDiscovery?.id ?? null,
            nextDiscoveryTitle: nextDiscovery?.title ?? null,
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
