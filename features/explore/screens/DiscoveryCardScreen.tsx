import { useCallback, useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { DiscoveryCard } from '@components/DiscoveryCard';
import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { getDiscoveryProgressService } from '../../../application/discoveryProgressRuntime';
import { getLearningPackAccessService } from '../../../application/commerce/commerceRuntime';
import { parseLearningPackId } from '@app-types/domain/ids';
import { useExplorerStore } from '@store/useExplorerStore';
import type { Discovery, LearningPack, World } from '@app-types/domain/content';
import type { ExploreScreenProps } from '@navigation/types';

const prefetchedImageUrls = new Set<string>();

function prefetchDiscoveryImage(discovery: Discovery | undefined): Promise<void> {
  const url = discovery?.images[0]?.url;
  if (!url || prefetchedImageUrls.has(url)) return Promise.resolve();
  prefetchedImageUrls.add(url);
  return Image.prefetch(url).then(
    () => undefined,
    () => undefined,
  );
}

/** The fact is visible immediately; progress persists as the user swipes forward. */
export function DiscoveryCardScreen({ route, navigation }: ExploreScreenProps<'DiscoveryCard'>) {
  const { deckId, discoveryId, replay = false } = route.params;
  const explorerId = useExplorerStore((state) => state.explorerId);
  const [pack, setPack] = useState<LearningPack | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right'>('right');

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
      const resolvedIndex =
        requestedIndex >= 0 ? requestedIndex : firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;

      await prefetchDiscoveryImage(discoveryResults[resolvedIndex]);
      if (cancelled) return;
      discoveryResults.forEach((discovery, position) => {
        if (position !== resolvedIndex) void prefetchDiscoveryImage(discovery);
      });

      setPack(packResult);
      setWorld(worldResult);
      setDiscoveries(discoveryResults);
      setCollectedIds(completed);
      setIndex(resolvedIndex);
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

  const handleSwipeNext = useCallback(async () => {
    if (replay) {
      setEnterFrom('right');
      if (index < discoveries.length - 1) {
        setIndex((current) => current + 1);
      } else if (pack) {
        navigation.replace('Completion', { deckId: pack.id, badgeEarnedNow: false });
      }
      return;
    }
    if (!currentDiscovery || !pack || !explorerId) return;

    const alreadyCollected = collectedIds.has(currentDiscovery.id);
    let learningPackCompletedNow = false;
    let worldBadgeEarnedNow = false;

    if (!alreadyCollected) {
      setIsSaving(true);
      setSaveFailed(false);
      try {
        const result = await getDiscoveryProgressService().collectDiscovery({
          explorerId,
          learningPackId: pack.id,
          discoveryId: currentDiscovery.id,
        });
        setCollectedIds((prev) => new Set(prev).add(currentDiscovery.id));
        learningPackCompletedNow = result.learningPackCompletedNow;
        worldBadgeEarnedNow = result.worldBadgeEarnedNow;
      } catch {
        setSaveFailed(true);
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    setEnterFrom('right');
    if (learningPackCompletedNow) {
      navigation.replace('Completion', { deckId: pack.id, badgeEarnedNow: worldBadgeEarnedNow });
    } else if (index < discoveries.length - 1) {
      setIndex((current) => current + 1);
    } else {
      navigation.goBack();
    }
  }, [
    replay,
    currentDiscovery,
    pack,
    explorerId,
    collectedIds,
    index,
    discoveries.length,
    navigation,
  ]);

  const handleSwipeBack = useCallback(() => {
    setEnterFrom('left');
    setSaveFailed(false);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

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
      canGoBack={index > 0}
      isSaving={isSaving}
      saveFailed={saveFailed}
      enterFrom={enterFrom}
      onSwipeNext={handleSwipeNext}
      onSwipeBack={handleSwipeBack}
      onClose={() => navigation.goBack()}
    />
  );
}
