import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { DiscoveryCard } from '@components/DiscoveryCard';
import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import type { ExploreScreenProps } from '@navigation/types';

/**
 * The core learning interaction — docs/design/01-screen-map.md "Discovery
 * Card": one discovery at a time, deliberate tap to advance, never an
 * infinite swipe feed.
 */
export function DiscoveryCardScreen({ route, navigation }: ExploreScreenProps<'DiscoveryCard'>) {
  const { deckId } = route.params;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [deckResult, discoveryResults] = await Promise.all([
        ContentRepository.getDeck(deckId),
        ContentRepository.getDiscoveriesForDeck(deckId),
      ]);
      if (!cancelled) {
        setDeck(deckResult);
        setDiscoveries(discoveryResults);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const currentDiscovery = discoveries[index];

  const handleNext = useCallback(async () => {
    if (!currentDiscovery || !deck) return;

    await ProgressRepository.completeDiscovery(currentDiscovery);

    const isLastDiscovery = index === discoveries.length - 1;
    if (isLastDiscovery) {
      const progress = await ProgressRepository.getDeckProgress(deck.id);
      const allComplete = (progress?.completedDiscoveryIds.length ?? 0) >= deck.discoveryIds.length;
      if (allComplete) {
        await ProgressRepository.markDeckCompleted(deck.id);
      }
      navigation.replace('Completion', { deckId: deck.id });
      return;
    }

    setIndex((current) => current + 1);
    setRevealed(false);
  }, [currentDiscovery, deck, discoveries.length, index, navigation]);

  const handlePrevious =
    index > 0
      ? () => {
          setIndex((current) => current - 1);
          setRevealed(false);
        }
      : undefined;

  if (isLoading || !currentDiscovery) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <DiscoveryCard
      discovery={currentDiscovery}
      revealed={revealed}
      onReveal={() => setRevealed(true)}
      onNext={handleNext}
      onPrevious={handlePrevious}
    />
  );
}
