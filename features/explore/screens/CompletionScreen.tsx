import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { JourneyCompletionScene } from '@components/JourneyCompletionScene';
import { useWorldSummaries } from '@features/explore/hooks/useWorldSummaries';
import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import type { ExploreScreenProps } from '@navigation/types';

interface CompletionData {
  deck: Deck;
  discoveries: Discovery[];
  badgePersisted: boolean;
}

/** Presentation only: collection and first-earned Badge state are persisted before this route. */
export function CompletionScreen({ route, navigation }: ExploreScreenProps<'Completion'>) {
  const { deckId, badgeEarnedNow } = route.params;
  const [data, setData] = useState<CompletionData | null>(null);
  const { summaries } = useWorldSummaries();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ContentRepository.getDeck(deckId),
      ContentRepository.getDiscoveriesForDeck(deckId),
      ProgressRepository.getDeckProgress(deckId),
    ]).then(([deck, discoveries, progress]) => {
      if (!cancelled && deck) {
        setData({ deck, discoveries, badgePersisted: Boolean(progress?.completedAt) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const nextWorld = useMemo(
    () =>
      data
        ? (summaries.find(
            (summary) =>
              !summary.locked &&
              summary.category.id !== data.deck.category &&
              summary.status !== 'completed',
          ) ?? null)
        : null,
    [data, summaries],
  );

  if (!data || !data.badgePersisted) return <View className="flex-1 bg-cream" />;

  const resetExplore = () => {
    navigation.reset({ index: 0, routes: [{ name: 'DiscoverySelection' }] });
  };

  return (
    <JourneyCompletionScene
      deck={data.deck}
      discoveries={data.discoveries}
      badgeEarnedNow={badgeEarnedNow}
      nextWorld={nextWorld}
      onSeeDiscoveries={() => {
        resetExplore();
        navigation.navigate('Collection');
      }}
      onExploreNext={() => {
        if (nextWorld) {
          navigation.replace('WorldHome', { worldId: nextWorld.category.id });
        } else {
          resetExplore();
        }
      }}
    />
  );
}
