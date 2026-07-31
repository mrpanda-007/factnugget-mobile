import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { CategoryCard } from '@components/CategoryCard';
import { colors, worldThemes } from '@constants/tokens';
import { useWorldSummaries } from '@features/explore/hooks/useWorldSummaries';
import type { ExploreScreenProps } from '@navigation/types';

/**
 * "What should we discover today?" — docs/design/01-screen-map.md. Curated
 * choices only, driven entirely by what content actually exists
 * (docs/implementation/04-content-platform.md) — never a hardcoded list of
 * worlds that don't have real decks behind them yet.
 */
export function DiscoverySelectionScreen({ navigation }: ExploreScreenProps<'DiscoverySelection'>) {
  const { summaries, isLoading } = useWorldSummaries();

  return (
    <View className="flex-1 bg-cream px-md pt-4xl">
      <Text className="text-center font-fredoka-bold text-display-xl text-ink-900">
        What should we discover today?
      </Text>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ocean500} />
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.category.id}
          numColumns={2}
          contentContainerClassName="gap-md py-xl"
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View className="flex-1">
              <CategoryCard
                world={worldThemes[item.category.id]}
                title={item.category.title}
                progress={item.progress}
                discoveriesFound={item.discoveriesFound}
                locked={item.locked}
                onPress={() =>
                  // Locked content always routes through the Parent tab's own
                  // entry point so ParentalGate is never bypassed
                  // (docs/design/01-screen-map.md — "the gate guards the
                  // entire tab"), not straight to PackPreview.
                  item.locked
                    ? navigation.navigate('Parent', { screen: 'Area' })
                    : navigation.navigate('WorldHome', { worldId: item.category.id })
                }
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
