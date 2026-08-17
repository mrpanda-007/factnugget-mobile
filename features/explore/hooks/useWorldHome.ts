import { useCallback, useState } from 'react';

import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { WorldId } from '@constants/tokens';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import type { DeckProgress } from '@app-types/Progress';
import type { EarnedBadge } from '@app-types/domain/progress';

interface WorldHomeState {
  isLoading: boolean;
  category: Category | null;
  deck: Deck | null;
  deckProgress: DeckProgress | null;
  worldBadge: EarnedBadge | null;
  discoveries: Discovery[];
  collectionPreview: Discovery[];
  nextDiscovery: Discovery | null;
}

const initialState: WorldHomeState = {
  isLoading: true,
  category: null,
  deck: null,
  deckProgress: null,
  worldBadge: null,
  discoveries: [],
  collectionPreview: [],
  nextDiscovery: null,
};

/**
 * Feature-local — World Home's specific mix of category/deck/progress/collection-preview data.
 *
 * Does not self-load: the caller drives it with `refresh()` inside
 * `useFocusEffect`, which already covers first mount as well as every return
 * to the screen. An additional `useEffect(() => { load() })` here would both
 * double-fetch on mount and trip `react-hooks/set-state-in-effect`.
 */
export function useWorldHome(worldId: WorldId) {
  const [state, setState] = useState<WorldHomeState>(initialState);

  const load = useCallback(async () => {
    const [category, decks, collected] = await Promise.all([
      ContentRepository.getCategory(worldId),
      ContentRepository.getDecksForCategory(worldId),
      ProgressRepository.getCollection(),
    ]);
    const deck = decks[0] ?? null;
    const [deckProgress, discoveries, worldBadge] = deck
      ? await Promise.all([
          ProgressRepository.getDeckProgress(deck.id),
          ContentRepository.getDiscoveriesForDeck(deck.id),
          ProgressRepository.getWorldBadge(worldId),
        ])
      : [null, [], null];

    let collectionPreview: Discovery[] = [];
    if (deck && collected.length > 0) {
      const worldDiscoveryIds = new Set(deck.discoveryIds);
      const relevantIds = collected
        .map((item) => item.discoveryId)
        .filter((id) => worldDiscoveryIds.has(id))
        .slice(0, 4);
      const discoveriesById = new Map(discoveries.map((discovery) => [discovery.id, discovery]));
      collectionPreview = relevantIds
        .map((id) => discoveriesById.get(id))
        .filter((discovery): discovery is Discovery => discovery !== undefined);
    }

    const completedIds = new Set(deckProgress?.completedDiscoveryIds ?? []);
    const nextDiscovery = discoveries.find((discovery) => !completedIds.has(discovery.id)) ?? null;

    setState({
      isLoading: false,
      category,
      deck,
      deckProgress,
      worldBadge,
      discoveries,
      collectionPreview,
      nextDiscovery,
    });
  }, [worldId]);

  return { ...state, refresh: load };
}
