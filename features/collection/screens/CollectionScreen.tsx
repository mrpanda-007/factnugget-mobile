import { useCallback, useState } from 'react';
import { FlatList, Modal, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button } from '@components/Button';
import { CollectionItem } from '@components/CollectionItem';
import { IllustrationStage } from '@components/IllustrationStage';
import { worldThemes } from '@constants/tokens';
import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Discovery } from '@app-types/Discovery';

/**
 * "My Discoveries" — docs/design/01-screen-map.md "Collection Shelf". Tapping
 * a tile opens the Quick Recall sheet in place; there is no separate route
 * to navigate to or back from.
 */
export function CollectionScreen() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [selected, setSelected] = useState<Discovery | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const collected = await ProgressRepository.getCollection();
    const results = await Promise.all(
      collected.map((item) => ContentRepository.getDiscovery(item.discoveryId)),
    );
    setDiscoveries(results.filter((discovery): discovery is Discovery => discovery !== null));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View className="flex-1 bg-cream px-lg pt-4xl">
      <Text className="text-center font-fredoka-bold text-display-xl text-ink-900">
        My Discoveries
      </Text>
      <Text className="mb-xl text-center font-nunito-regular text-body-md text-ink-600">
        {discoveries.length} discoveries collected
      </Text>

      {!isLoading && discoveries.length === 0 ? (
        <View className="flex-1 items-center gap-md pb-3xl pt-3xl">
          <Text style={{ fontSize: 48 }}>🔭</Text>
          <Text className="text-center font-nunito-semibold text-body-md text-ink-400">
            Complete a discovery to start your collection!
          </Text>
        </View>
      ) : (
        <FlatList
          data={discoveries}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerClassName="gap-lg pb-3xl"
          columnWrapperStyle={{ gap: 16 }}
          renderItem={({ item }) => (
            <CollectionItem discovery={item} onPress={() => setSelected(item)} />
          )}
        />
      )}

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-xl">
          {selected ? (
            <View className="w-full items-center gap-lg rounded-xl bg-surface p-xl">
              <IllustrationStage
                emoji={selected.emoji}
                theme={worldThemes[selected.category]}
                size={140}
              />
              <Text className="font-fredoka-semibold text-display-md text-ink-900">
                {selected.title}
              </Text>
              <Text className="text-center font-nunito-semibold text-body-lg text-ink-900">
                {selected.funFact}
              </Text>
              <Button label="Close" variant="secondary" onPress={() => setSelected(null)} />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
