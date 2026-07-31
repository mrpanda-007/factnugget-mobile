import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { CategoryCard } from '@components/CategoryCard';
import { CollectionItem } from '@components/CollectionItem';
import { SectionHeader } from '@components/SectionHeader';
import { WorldBackground } from '@components/WorldBackground';
import { worldThemes } from '@constants/tokens';
import { useWorldHome } from '@features/explore/hooks/useWorldHome';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { ExploreScreenProps } from '@navigation/types';

/**
 * The miniature world home — docs/design/01-screen-map.md "World Home":
 * Continue Exploring / New Discoveries → My Collection preview.
 */
export function WorldHomeScreen({ route, navigation }: ExploreScreenProps<'WorldHome'>) {
  const { worldId } = route.params;
  const theme = worldThemes[worldId];
  const { isLoading, category, deck, deckProgress, collectionPreview, refresh } =
    useWorldHome(worldId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleStartOrContinue = async () => {
    if (!deck) return;
    await ProgressRepository.startOrTouchDeck(deck.id);
    navigation.navigate('DiscoveryCard', { deckId: deck.id });
  };

  const progressFraction =
    deck && deckProgress
      ? deckProgress.completedDiscoveryIds.length / deck.discoveryIds.length
      : undefined;

  const sectionTitle = !deckProgress
    ? 'New Discovery'
    : deckProgress.completedAt
      ? 'Explore Again'
      : 'Continue Exploring';

  return (
    <View className="flex-1 bg-cream">
      <WorldBackground world={theme} intensity="subtle" />

      <ScrollView
        contentContainerClassName="gap-2xl px-lg pb-3xl pt-4xl"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-xs">
          <Text style={{ fontSize: 40 }}>{theme.emoji}</Text>
          <Text className="font-fredoka-bold text-display-lg text-ink-900">
            {category?.title ?? theme.label}
          </Text>
          {category?.tagline ? (
            <Text className="text-center font-nunito-regular text-body-md text-ink-600">
              {category.tagline}
            </Text>
          ) : null}
        </View>

        {!isLoading && deck ? (
          <View className="gap-md">
            <SectionHeader title={sectionTitle} />
            <CategoryCard
              world={theme}
              title={deck.title}
              progress={progressFraction}
              discoveriesFound={deckProgress?.completedDiscoveryIds.length}
              onPress={handleStartOrContinue}
            />
          </View>
        ) : null}

        <View className="gap-md">
          <SectionHeader
            title="My Collection"
            action={{ label: 'See all', onPress: () => navigation.navigate('Collection') }}
          />
          {collectionPreview.length > 0 ? (
            <View className="flex-row flex-wrap gap-lg">
              {collectionPreview.map((discovery) => (
                <CollectionItem
                  key={discovery.id}
                  discovery={discovery}
                  onPress={() => navigation.navigate('Collection')}
                />
              ))}
            </View>
          ) : (
            <Text className="font-nunito-regular text-body-md text-ink-400">
              Complete a discovery to start your collection!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
