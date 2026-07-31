import { useEffect, useState } from 'react';

import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';

export interface WorldSummary {
  category: Category;
  deck: Deck;
  progress: number | undefined;
  discoveriesFound: number | undefined;
  /** No entitlement system exists yet — see types/Deck.ts#isFree. */
  locked: boolean;
}

/** Feature-local — only Discovery Selection needs the curated per-world summary shape. */
export function useWorldSummaries() {
  const [summaries, setSummaries] = useState<WorldSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
            };
          }

          const deckProgress = await ProgressRepository.getDeckProgress(deck.id);
          return {
            category,
            deck,
            progress: deckProgress
              ? deckProgress.completedDiscoveryIds.length / deck.discoveryIds.length
              : undefined,
            discoveriesFound: deckProgress?.completedDiscoveryIds.length,
            locked: false,
          };
        }),
      );

      if (!cancelled) {
        setSummaries(results.filter((result): result is WorldSummary => result !== null));
        setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { summaries, isLoading };
}
