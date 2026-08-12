import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { WorldId } from '@constants/tokens';
import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';

export interface ParentRecentDiscovery {
  id: string;
  title: string;
  funFact: string;
  emoji: string;
  category: WorldId;
  heroImage: string | null;
  images: string[];
  collectedAt: string;
}

export interface ParentBadgeSummary {
  deckId: string;
  worldId: WorldId;
  worldTitle: string;
  title: string;
  icon: string;
  earnedAt: string;
}

export interface ParentPackSummary {
  deckId: string;
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

interface DeckContent {
  category: Category;
  deck: Deck;
  discoveries: Discovery[];
}

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
      const categories = await ContentRepository.getCategories();
      const deckGroups = await Promise.all(
        categories.map(async (category) => {
          const decks = await ContentRepository.getDecksForCategory(category.id);
          return decks.map((deck) => ({ category, deck }));
        }),
      );
      const deckEntries = deckGroups.flat();
      const deckContent = await Promise.all(
        deckEntries.map(async ({ category, deck }): Promise<DeckContent> => ({
          category,
          deck,
          discoveries: await ContentRepository.getDiscoveriesForDeck(deck.id),
        })),
      );
      const [collected, deckProgress] = await Promise.all([
        ProgressRepository.getCollection(),
        Promise.all(
          deckContent.map(async ({ deck }) => ({
            deckId: deck.id,
            progress: await ProgressRepository.getDeckProgress(deck.id),
          })),
        ),
      ]);

      const discoveryById = new Map(
        deckContent.flatMap(({ discoveries }) =>
          discoveries.map((discovery) => [discovery.id, discovery]),
        ),
      );
      const entryByDeckId = new Map(deckContent.map((entry) => [entry.deck.id, entry]));
      const completedAtByDeckId = new Map(
        deckProgress.flatMap(({ deckId, progress: deck }) =>
          deck?.completedAt ? [[deckId, deck.completedAt] as const] : [],
        ),
      );

      const recentDiscoveries = collected
        .map(({ discoveryId, collectedAt }) => {
          const discovery = discoveryById.get(discoveryId);
          return discovery
            ? {
                id: discovery.id,
                title: discovery.title,
                funFact: discovery.funFact,
                emoji: discovery.emoji,
                category: discovery.category,
                heroImage: discovery.heroImage,
                images: discovery.images,
                collectedAt,
              }
            : null;
        })
        .filter((discovery): discovery is ParentRecentDiscovery => discovery !== null)
        .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt))
        .slice(0, 4);

      const badges = [...completedAtByDeckId.entries()]
        .map(([deckId, earnedAt]) => {
          const entry = entryByDeckId.get(deckId);
          return entry
            ? {
                deckId,
                worldId: entry.category.id,
                worldTitle: entry.category.title,
                title: entry.deck.rewardBadge.label,
                icon: entry.deck.rewardBadge.icon,
                earnedAt,
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
          lockedPacks: deckContent
            .filter(({ deck }) => !deck.isFree)
            .map(({ deck }) => ({
              deckId: deck.id,
              title: deck.title,
              discoveryCount: deck.discoveryIds.length,
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
