import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { JourneyCompletionScene } from '@components/JourneyCompletionScene';
import { useWorldSummaries } from '@features/explore/hooks/useWorldSummaries';
import * as ContentRepository from '@repositories/ContentRepository';
import type { Deck } from '@app-types/Deck';
import type { ExploreScreenProps } from '@navigation/types';

/**
 * The journey-completion route is a cinematic presentation of state that has
 * already been persisted by DiscoveryCardScreen. It does not write progress or
 * award anything a second time when the scene re-renders.
 */
export function CompletionScreen({ route, navigation }: ExploreScreenProps<'Completion'>) {
  const { deckId } = route.params;
  const [deck, setDeck] = useState<Deck | null>(null);
  const { summaries, isLoading: summariesLoading } = useWorldSummaries();

  useEffect(() => {
    let cancelled = false;
    ContentRepository.getDeck(deckId).then((result) => {
      if (!cancelled) setDeck(result);
    });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const completedWorldIds = useMemo(
    () =>
      summaries.filter((summary) => summary.progress === 1).map((summary) => summary.category.id),
    [summaries],
  );
  const nextWorlds = useMemo(
    () =>
      deck
        ? summaries.filter(
            (summary) =>
              !summary.locked && summary.category.id !== deck.category && summary.progress !== 1,
          )
        : [],
    [deck, summaries],
  );

  // The reveal starts only once all real data it references has resolved.
  if (!deck || summariesLoading) return <View className="flex-1 bg-cream" />;

  return (
    <JourneyCompletionScene
      deck={deck}
      completedWorldIds={completedWorldIds}
      nextWorlds={nextWorlds}
      onExploreWorld={(worldId) => navigation.replace('WorldHome', { worldId })}
      onReturnToMap={() => navigation.reset({ index: 0, routes: [{ name: 'DiscoverySelection' }] })}
    />
  );
}
