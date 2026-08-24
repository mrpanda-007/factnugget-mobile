import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { JourneyCompletionScene } from '@components/JourneyCompletionScene';
import { useWorldSummaries } from '@features/explore/hooks/useWorldSummaries';
import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { parseLearningPackId } from '@app-types/domain/ids';
import type { Discovery, LearningPack, World } from '@app-types/domain/content';
import type { ExploreScreenProps } from '@navigation/types';

interface CompletionData {
  world: World;
  pack: LearningPack;
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
    const packId = parseLearningPackId(deckId);
    liveContentRepository.getLearningPack(packId).then(async (pack) => {
      if (cancelled || !pack) return;
      const [world, packDiscoveries] = await Promise.all([
        liveContentRepository.getWorld(pack.worldId),
        liveContentRepository.listPackDiscoveries(packId),
      ]);
      if (cancelled || !world) return;
      const badge = await ProgressRepository.getWorldBadge(world.id);
      if (!cancelled) {
        setData({
          world,
          pack,
          discoveries: packDiscoveries.map(({ discovery }) => discovery),
          badgePersisted: Boolean(badge),
        });
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
              summary.world.id !== data.world.id &&
              summary.status !== 'completed',
          ) ?? null)
        : null,
    [data, summaries],
  );

  if (!data) return <View className="flex-1 bg-cream" />;

  const resetExplore = () => {
    navigation.reset({ index: 0, routes: [{ name: 'DiscoverySelection' }] });
  };

  return (
    <JourneyCompletionScene
      world={data.world}
      packTitle={data.pack.title}
      discoveries={data.discoveries}
      badgeEarnedNow={badgeEarnedNow}
      badgeAvailable={data.badgePersisted}
      nextWorld={nextWorld}
      onSeeDiscoveries={() => {
        resetExplore();
        navigation.navigate('Collection');
      }}
      onExploreNext={() => {
        if (nextWorld) {
          navigation.replace('WorldHome', { worldId: nextWorld.world.id });
        } else {
          resetExplore();
        }
      }}
    />
  );
}
