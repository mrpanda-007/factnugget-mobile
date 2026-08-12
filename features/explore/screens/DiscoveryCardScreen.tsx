import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { DiscoveryCard } from '@components/DiscoveryCard';
import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import type { ExploreScreenProps } from '@navigation/types';

type Destination =
  { type: 'discovery'; index: number } | { type: 'completion' } | { type: 'close' };

/** The learning interaction persists only after the explicit Add action. */
export function DiscoveryCardScreen({ route, navigation }: ExploreScreenProps<'DiscoveryCard'>) {
  const { deckId, discoveryId } = route.params;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const destination = useRef<Destination>({ type: 'close' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [deckResult, discoveryResults, progress] = await Promise.all([
        ContentRepository.getDeck(deckId),
        ContentRepository.getDiscoveriesForDeck(deckId),
        ProgressRepository.getDeckProgress(deckId),
        ProgressRepository.startOrTouchDeck(deckId),
      ]);
      if (cancelled) return;

      const completed = new Set(progress?.completedDiscoveryIds ?? []);
      const requestedIndex = discoveryId
        ? discoveryResults.findIndex((item) => item.id === discoveryId)
        : -1;
      const firstIncompleteIndex = discoveryResults.findIndex((item) => !completed.has(item.id));

      setDeck(deckResult);
      setDiscoveries(discoveryResults);
      setCollectedIds(completed);
      setIndex(
        requestedIndex >= 0 ? requestedIndex : firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0,
      );
      setIsLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [deckId, discoveryId]);

  const currentDiscovery = discoveries[index];

  const nextIncompleteIndex = useCallback(
    (ids: Set<string>) => {
      for (let offset = 1; offset <= discoveries.length; offset += 1) {
        const candidate = (index + offset) % discoveries.length;
        if (!ids.has(discoveries[candidate].id)) return candidate;
      }
      return -1;
    },
    [discoveries, index],
  );

  const nextDiscoveryTitle = useMemo(() => {
    if (!currentDiscovery) return undefined;
    const nextIndex = nextIncompleteIndex(collectedIds);
    return nextIndex >= 0 ? discoveries[nextIndex].title : undefined;
  }, [collectedIds, currentDiscovery, discoveries, nextIncompleteIndex]);

  const handleCollect = useCallback(async () => {
    if (!currentDiscovery || !deck) return;

    await ProgressRepository.completeDiscovery(currentDiscovery);
    const updated = new Set(collectedIds).add(currentDiscovery.id);
    setCollectedIds(updated);

    const allRequiredCollected =
      deck.discoveryIds.length > 0 && deck.discoveryIds.every((id) => updated.has(id));
    if (allRequiredCollected) {
      await ProgressRepository.markDeckCompleted(deck.id);
      destination.current = { type: 'completion' };
      return;
    }

    const nextIndex = nextIncompleteIndex(updated);
    destination.current =
      nextIndex >= 0 ? { type: 'discovery', index: nextIndex } : { type: 'close' };
  }, [collectedIds, currentDiscovery, deck, nextIncompleteIndex]);

  const handleAcknowledged = useCallback(() => {
    let target = destination.current;
    if (target.type === 'close' && currentDiscovery && collectedIds.has(currentDiscovery.id)) {
      const nextIndex = nextIncompleteIndex(collectedIds);
      target = nextIndex >= 0 ? { type: 'discovery', index: nextIndex } : { type: 'close' };
    }

    if (target.type === 'completion' && deck) {
      navigation.replace('Completion', { deckId: deck.id });
    } else if (target.type === 'discovery') {
      destination.current = { type: 'close' };
      setIndex(target.index);
    } else {
      navigation.goBack();
    }
  }, [collectedIds, currentDiscovery, deck, navigation, nextIncompleteIndex]);

  if (isLoading || !currentDiscovery) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <DiscoveryCard
      key={currentDiscovery.id}
      discovery={currentDiscovery}
      position={index + 1}
      total={discoveries.length}
      collected={collectedIds.has(currentDiscovery.id)}
      nextDiscoveryTitle={nextDiscoveryTitle}
      onCollect={handleCollect}
      onAcknowledged={handleAcknowledged}
      onClose={() => navigation.goBack()}
    />
  );
}
