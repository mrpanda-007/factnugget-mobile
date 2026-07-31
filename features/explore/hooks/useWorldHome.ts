import { useCallback, useState } from 'react';

import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { WorldId } from '@constants/tokens';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import type { DeckProgress } from '@app-types/Progress';

interface WorldHomeState {
  isLoading: boolean;
  category: Category | null;
  deck: Deck | null;
  deckProgress: DeckProgress | null;
  collectionPreview: Discovery[];
}

const initialState: WorldHomeState = {
  isLoading: true,
  category: null,
  deck: null,
  deckProgress: null,
  collectionPreview: [],
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
    const deckProgress = deck ? await ProgressRepository.getDeckProgress(deck.id) : null;

    let collectionPreview: Discovery[] = [];
    if (deck && collected.length > 0) {
      const worldDiscoveryIds = new Set(deck.discoveryIds);
      const relevantIds = collected
        .map((item) => item.discoveryId)
        .filter((id) => worldDiscoveryIds.has(id))
        .slice(0, 4);
      const discoveries = await Promise.all(
        relevantIds.map((id) => ContentRepository.getDiscovery(id)),
      );
      collectionPreview = discoveries.filter(
        (discovery): discovery is Discovery => discovery !== null,
      );
    }

    setState({ isLoading: false, category, deck, deckProgress, collectionPreview });
  }, [worldId]);

  return { ...state, refresh: load };
}
