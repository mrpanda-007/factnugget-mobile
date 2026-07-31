import { FlatList, Text, View } from 'react-native';

import { CategoryCard } from '@components/CategoryCard';
import { explorerIdentityOptions, identityWorldId } from '@constants/explorerIdentities';
import { worldThemes } from '@constants/tokens';
import { useExplorerStore } from '@store/useExplorerStore';
import type { ExplorerIdentityOption } from '@app-types/ExplorerIdentity';

/**
 * "Who will you become?" — docs/design/01-screen-map.md. Choosing an
 * identity updates useExplorerStore, which is all RootNavigator needs to
 * swap from Onboarding to Main — no explicit navigate() call here.
 */
export function ExplorerIdentityScreen() {
  const chooseIdentity = useExplorerStore((state) => state.chooseIdentity);

  const renderItem = ({ item }: { item: ExplorerIdentityOption }) => (
    <View className="w-1/2 p-sm">
      <CategoryCard
        world={worldThemes[identityWorldId[item.id]]}
        title={item.label}
        description={item.description}
        onPress={() => chooseIdentity(item.id)}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-cream px-md pt-4xl">
      <Text className="text-center font-fredoka-bold text-display-xl text-ink-900">
        Who will you become?
      </Text>
      <FlatList
        data={explorerIdentityOptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerClassName="py-xl"
      />
    </View>
  );
}
