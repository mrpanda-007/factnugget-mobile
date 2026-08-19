import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { DiscoveryCard } from '@components/DiscoveryCard';
import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { getDiscoveryProgressService } from '../../../application/discoveryProgressRuntime';
import { getLearningPackAccessService } from '../../../application/commerce/commerceRuntime';
import { parseLearningPackId } from '@app-types/domain/ids';
import { useExplorerStore } from '@store/useExplorerStore';
import type { Discovery, LearningPack, World } from '@app-types/domain/content';
import type { ExploreScreenProps } from '@navigation/types';

type Destination =
  | { type: 'discovery'; index: number }
  | { type: 'completion'; badgeEarnedNow: boolean }
  | { type: 'close' };

/** The learning interaction persists only after the explicit Add action. */
export function DiscoveryCardScreen({ route, navigation }: ExploreScreenProps<'DiscoveryCard'>) {
  const { deckId, discoveryId, replay = false } = route.params;
  const explorerId = useExplorerStore((state) => state.explorerId);
  const [pack, setPack] = useState<LearningPack | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const destination = useRef<Destination>({ type: 'close' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const packId = parseLearningPackId(deckId);
      const [packResult, access] = await Promise.all([
        liveContentRepository.getLearningPack(packId),
        getLearningPackAccessService().getLearningPackAccess(packId),
      ]);
      if (cancelled) return;

      if (access.state !== 'allowed') {
        if (packResult) {
          navigation.navigate('Parent', {
            screen: 'Area',
            params: {
              deckId: packResult.id,
              requestedPackTitle: packResult.title,
              requestId: String(Date.now()),
            },
          });
        } else {
          navigation.goBack();
        }
        return;
      }

      const [packDiscoveries, worldResult, progress] = await Promise.all([
        liveContentRepository.listPackDiscoveries(packId),
        packResult ? liveContentRepository.getWorld(packResult.worldId) : Promise.resolve(null),
        ProgressRepository.getDeckProgress(deckId),
      ]);
      await ProgressRepository.startOrTouchDeck(deckId);
      if (cancelled) return;

      const discoveryResults = packDiscoveries.map(({ discovery }) => discovery);
      const completed = new Set(progress?.completedDiscoveryIds ?? []);
      const requestedIndex = discoveryId
        ? discoveryResults.findIndex((item) => item.id === discoveryId)
        : -1;
      const firstIncompleteIndex = discoveryResults.findIndex((item) => !completed.has(item.id));

      setPack(packResult);
      setWorld(worldResult);
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
  }, [deckId, discoveryId, explorerId, replay]);

  const currentDiscovery = discoveries[index];

  useEffect(() => {
    if (!explorerId || !pack || !currentDiscovery || replay) return;
    void getDiscoveryProgressService().revealDiscovery({
      explorerId,
      learningPackId: pack.id,
      discoveryId: currentDiscovery.id,
    });
  }, [currentDiscovery, pack, explorerId, replay]);

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
    if (replay) return discoveries[index + 1]?.title;
    const nextIndex = nextIncompleteIndex(collectedIds);
    return nextIndex >= 0 ? discoveries[nextIndex].title : undefined;
  }, [collectedIds, currentDiscovery, discoveries, index, nextIncompleteIndex, replay]);

  const handleCollect = useCallback(async () => {
    if (!currentDiscovery || !pack) return;

    if (!explorerId) throw new Error('An active Explorer is required to collect a Discovery.');
    const result = await getDiscoveryProgressService().collectDiscovery({
      explorerId,
      learningPackId: pack.id,
      discoveryId: currentDiscovery.id,
    });
    const updated = new Set(collectedIds).add(currentDiscovery.id);
    setCollectedIds(updated);
    if (result.learningPackCompletedNow) {
      destination.current = { type: 'completion', badgeEarnedNow: result.worldBadgeEarnedNow };
      return;
    }

    const nextIndex = nextIncompleteIndex(updated);
    destination.current =
      nextIndex >= 0 ? { type: 'discovery', index: nextIndex } : { type: 'close' };
  }, [collectedIds, currentDiscovery, pack, explorerId, nextIncompleteIndex]);

  const handleAcknowledged = useCallback(() => {
    if (replay && pack) {
      if (index < discoveries.length - 1) {
        setIndex((current) => current + 1);
      } else {
        navigation.replace('Completion', { deckId: pack.id, badgeEarnedNow: false });
      }
      return;
    }

    let target = destination.current;
    if (target.type === 'close' && currentDiscovery && collectedIds.has(currentDiscovery.id)) {
      const nextIndex = nextIncompleteIndex(collectedIds);
      target = nextIndex >= 0 ? { type: 'discovery', index: nextIndex } : { type: 'close' };
    }

    if (target.type === 'completion' && pack) {
      navigation.replace('Completion', {
        deckId: pack.id,
        badgeEarnedNow: target.badgeEarnedNow,
      });
    } else if (target.type === 'discovery') {
      destination.current = { type: 'close' };
      setIndex(target.index);
    } else {
      navigation.goBack();
    }
  }, [
    collectedIds,
    currentDiscovery,
    pack,
    discoveries.length,
    index,
    navigation,
    nextIncompleteIndex,
    replay,
  ]);

  if (isLoading || !currentDiscovery || !world) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <DiscoveryCard
      key={currentDiscovery.id}
      discovery={currentDiscovery}
      worldId={world.themeKey}
      position={index + 1}
      total={discoveries.length}
      collected={collectedIds.has(currentDiscovery.id)}
      nextDiscoveryTitle={nextDiscoveryTitle}
      collectedActionLabel={
        replay && index === discoveries.length - 1
          ? `FINISH EXPLORING ${world.title.toLocaleUpperCase()} →`
          : undefined
      }
      onCollect={handleCollect}
      onAcknowledged={handleAcknowledged}
      onClose={() => navigation.goBack()}
    />
  );
}
