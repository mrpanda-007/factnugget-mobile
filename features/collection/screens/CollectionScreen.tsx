import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useReducedMotion } from 'react-native-reanimated';

import { ExplorerTreasureTreeScene } from '@components/ExplorerTreasureTreeScene';
import { explorerIdentityOptions } from '@constants/explorerIdentities';
import { colors, fontFamily } from '@constants/tokens';
import {
  createTreeBranches,
  getTreeGrowthStage,
  type TreeBranch,
  type TreeCollectible,
} from '@features/collection/treePresentation';
import * as ContentRepository from '@repositories/ContentRepository';
import * as ProgressRepository from '@repositories/ProgressRepository';
import { useExplorerStore } from '@store/useExplorerStore';
import type { Discovery } from '@app-types/Discovery';
import type { CollectedDiscovery } from '@app-types/Progress';
import type { CollectionScreenProps } from '@navigation/types';

/**
 * The collection is an orbitable storybook museum, not an achievement grid.
 * Progress remains entirely owned by SQLite/ContentRepository; this screen only
 * derives an anchor-based visual presentation from it.
 */
export function CollectionScreen({ navigation }: CollectionScreenProps) {
  const identity = useExplorerStore((state) => state.identity);
  const reducedMotion = useReducedMotion();
  const [collected, setCollected] = useState<CollectedDiscovery[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [selectedCollectible, setSelectedCollectible] = useState<TreeCollectible | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<TreeBranch | null>(null);
  const [resetToken, setResetToken] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    const collection = await ProgressRepository.getCollection();
    const loadedDiscoveries = await Promise.all(
      collection.map((item) => ContentRepository.getDiscovery(item.discoveryId)),
    );
    setCollected(collection);
    setDiscoveries(loadedDiscoveries.filter((item): item is Discovery => item !== null));
    setSelectedCollectible(null);
    setSelectedBranch(null);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const branches = useMemo(
    () => createTreeBranches(discoveries, collected),
    [collected, discoveries],
  );
  const growthStage = getTreeGrowthStage(discoveries.length);
  const explorer = explorerIdentityOptions.find((option) => option.id === identity);
  const plaque = selectedCollectible ?? selectedBranch?.collectibles[0] ?? null;

  const chooseCollectible = (collectible: TreeCollectible) => {
    setSelectedBranch(branches.find((branch) => branch.worldId === collectible.category) ?? null);
    setSelectedCollectible(collectible);
  };
  const chooseBranch = (branch: TreeBranch) => {
    setSelectedBranch(branch);
    setSelectedCollectible(null);
  };
  const closePlaque = () => {
    setSelectedCollectible(null);
    setSelectedBranch(null);
  };

  return (
    <View style={styles.screen}>
      <ExplorerTreasureTreeScene
        branches={branches}
        growthStage={growthStage}
        selectedCollectible={selectedCollectible}
        onSelectCollectible={chooseCollectible}
        onSelectBranch={chooseBranch}
        reducedMotion={reducedMotion}
        onReady={() => setSceneReady(true)}
        resetToken={resetToken}
      />

      <View style={styles.header} pointerEvents="box-none">
        <View
          style={styles.identityPill}
          accessible
          accessibilityLabel={`${explorer?.label ?? 'Guest explorer'} profile`}
        >
          <Text style={styles.avatar}>{explorer?.emoji ?? '✦'}</Text>
          <View>
            <Text style={styles.identityName}>{explorer?.label ?? 'Guest explorer'}</Text>
            <Text style={styles.identityMeta}>
              {discoveries.length} {discoveries.length === 1 ? 'discovery' : 'discoveries'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to the whole Explorer Tree"
          hitSlop={12}
          onPress={() => {
            closePlaque();
            setResetToken((token) => token + 1);
          }}
          style={styles.homeControl}
        >
          <Text style={styles.homeIcon}>⌂</Text>
        </Pressable>
      </View>

      {!sceneReady || isLoading ? (
        <View style={styles.loading} pointerEvents="none">
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.explorerGreen700} />
            <Text style={styles.loadingText}>Growing your Explorer Tree…</Text>
          </View>
        </View>
      ) : null}

      {!isLoading && discoveries.length === 0 ? (
        <View style={styles.emptyNote} pointerEvents="none">
          <Text style={styles.emptyTitle}>Your Explorer Tree is just beginning.</Text>
          <Text style={styles.emptyCopy}>Every adventure helps it grow.</Text>
        </View>
      ) : null}

      {plaque ? (
        <View style={styles.plaque} accessible accessibilityViewIsModal>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close artifact details"
            hitSlop={10}
            onPress={closePlaque}
            style={styles.closePlaque}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.plaqueWorld}>{selectedBranch?.title ?? 'Explorer Tree'}</Text>
          <Text style={styles.plaqueTitle}>{plaque.title}</Text>
          <Text style={styles.plaqueCopy} numberOfLines={3}>
            {plaque.funFact}
          </Text>
          <Text style={styles.plaqueDate}>
            Found{' '}
            {new Date(plaque.collectedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {selectedBranch ? (
            <Text style={styles.plaqueCount}>
              {selectedBranch.discoveryCount}{' '}
              {selectedBranch.discoveryCount === 1 ? 'discovery' : 'discoveries'} on this branch
            </Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Discover new worlds"
        accessibilityHint="Opens the discovery worlds"
        onPress={() => navigation.navigate('Explore', { screen: 'DiscoverySelection' })}
        style={styles.exploreSign}
      >
        <Text style={styles.signArrow}>✦</Text>
        <Text style={styles.signText}>Discover New Worlds</Text>
      </Pressable>

      {!identity ? (
        <View style={styles.guestNote} pointerEvents="none">
          <Text style={styles.guestTitle}>Exploring as a guest</Text>
          <Text style={styles.guestCopy}>Your tree is safely growing on this device.</Text>
        </View>
      ) : null}

      {/* Screen-reader alternative to the spatial scene. */}
      <View accessible accessibilityLabel="Explorer Tree collection" style={styles.accessibleTree}>
        {branches.map((branch) => (
          <Text key={branch.id} accessibilityRole="text">
            {branch.title}. {branch.discoveryCount} discoveries.
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E7E0CB', overflow: 'hidden' },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 14,
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#DAC397',
    shadowColor: '#4E382A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: { fontSize: 23, marginRight: 7 },
  identityName: { color: '#49382A', fontFamily: fontFamily.displaySemiBold, fontSize: 13 },
  identityMeta: { color: '#786248', fontFamily: fontFamily.bodySemiBold, fontSize: 10 },
  homeControl: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DAC397',
  },
  homeIcon: { color: '#62452E', fontSize: 23, lineHeight: 25 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  loadingCard: {
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFF9EC',
    borderRadius: 20,
    paddingHorizontal: 21,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#DDC492',
  },
  loadingText: { color: '#5D4834', fontFamily: fontFamily.displaySemiBold, fontSize: 14 },
  emptyNote: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 128,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#4F3B2D',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 18,
    textAlign: 'center',
  },
  emptyCopy: { color: '#6D5B45', fontFamily: fontFamily.bodySemiBold, fontSize: 13, marginTop: 4 },
  plaque: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 116,
    backgroundColor: '#FFF9EA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9BE89',
    padding: 17,
    shadowColor: '#473426',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 16,
    elevation: 6,
  },
  closePlaque: { position: 'absolute', right: 9, top: 7, padding: 8 },
  closeText: {
    color: '#786248',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 23,
    lineHeight: 23,
  },
  plaqueWorld: {
    color: '#A16A2B',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  plaqueTitle: {
    color: '#49382A',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 20,
    marginTop: 2,
    paddingRight: 25,
  },
  plaqueCopy: {
    color: '#645342',
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 7,
  },
  plaqueDate: {
    color: '#887054',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    marginTop: 10,
  },
  plaqueCount: {
    color: '#6C825C',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 11,
    marginTop: 4,
  },
  exploreSign: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
    backgroundColor: '#795037',
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#B78756',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3F2A1E',
    shadowOpacity: 0.23,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  signArrow: { color: '#F6D578', fontSize: 14 },
  signText: { color: '#FFF5D7', fontFamily: fontFamily.displaySemiBold, fontSize: 15 },
  guestNote: {
    position: 'absolute',
    bottom: 82,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9EA99',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  guestTitle: { color: '#685541', fontFamily: fontFamily.bodyExtraBold, fontSize: 10 },
  guestCopy: { color: '#806C56', fontFamily: fontFamily.bodyRegular, fontSize: 9 },
  accessibleTree: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -100 },
});
