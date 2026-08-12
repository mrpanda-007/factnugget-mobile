import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@components/Button';
import { CollectionBookCard } from '@features/collection/components/CollectionBookCard';
import { CollectionDetailSheet } from '@features/collection/components/CollectionDetailSheet';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { ExplorerSummary } from '@features/collection/components/ExplorerSummary';
import { FeaturedCollection } from '@features/collection/components/FeaturedCollection';
import { useCollections } from '@features/collection/hooks/useCollections';
import { WorldBadge } from '@features/rewards/components/WorldBadge';
import { animationDurations, colors, fontFamily, radius, spacing } from '@constants/tokens';
import type { ExplorerCollection } from '@features/collection/types';
import type { CollectionScreenProps } from '@navigation/types';

function findDiscovery(
  collections: ExplorerCollection[],
  discoveryId: string | null,
): { collection: ExplorerCollection; discovery: ExplorerCollection['discoveries'][number] } | null {
  if (!discoveryId) return null;
  for (const collection of collections) {
    const discovery = collection.discoveries.find((item) => item.id === discoveryId);
    if (discovery) return { collection, discovery };
  }
  return null;
}

export function CollectionScreen({ navigation }: CollectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const {
    collections,
    featured,
    totalDiscovered,
    totalAvailable,
    newestDiscoveryId,
    isLoading,
    loadFailed,
    refresh,
  } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<ExplorerCollection | null>(null);
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState<string | null>(null);

  const completedCollections = useMemo(
    () => collections.filter((collection) => collection.status === 'completed'),
    [collections],
  );
  const newestDiscovery = findDiscovery(collections, newestDiscoveryId);
  const featuredNextDiscovery = featured?.discoveries.find(
    (discovery) => !featured.discoveredIds.has(discovery.id),
  );
  const nextCollection =
    collections.find(
      (collection) => collection.id !== featured?.id && collection.status === 'not_started',
    ) ?? collections.find((collection) => collection.status === 'locked');
  const maxContentWidth = width >= 820 ? 960 : 680;
  const horizontalPadding = width >= 700 ? spacing['2xl'] : spacing.lg;
  const availableWidth = Math.min(width, maxContentWidth) - horizontalPadding * 2;
  const cardWidth = width >= 700 ? (availableWidth - spacing.lg) / 2 : Math.min(330, width * 0.82);
  const entrance = reducedMotion
    ? FadeIn.duration(animationDurations.fast)
    : FadeInUp.duration(animationDurations.slow);

  const openWorld = (collection: ExplorerCollection) => {
    setSelectedDiscoveryId(null);
    setSelectedCollection(null);
    if (collection.status === 'locked') {
      navigation.navigate('Parent', { screen: 'Area' });
      return;
    }
    navigation.navigate('Explore', {
      screen: 'WorldHome',
      params: { worldId: collection.category.id },
    });
  };

  if (isLoading && collections.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.ocean500} />
        <Text style={{ color: colors.ink600, fontFamily: fontFamily.bodySemiBold, fontSize: 16 }}>
          Opening My Discoveries…
        </Text>
      </View>
    );
  }

  if (loadFailed && collections.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
          padding: spacing['2xl'],
          backgroundColor: colors.cream,
        }}
      >
        <Text
          style={{
            color: colors.ink900,
            fontFamily: fontFamily.displaySemiBold,
            fontSize: 24,
            textAlign: 'center',
          }}
        >
          My Discoveries needs a moment.
        </Text>
        <Text
          style={{
            color: colors.ink600,
            fontFamily: fontFamily.bodyRegular,
            fontSize: 16,
            textAlign: 'center',
          }}
        >
          Everything you discovered is still safe.
        </Text>
        <Button label="Try Again" onPress={refresh} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing['4xl'],
          gap: spacing['2xl'],
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            paddingHorizontal: horizontalPadding,
            gap: spacing['2xl'],
          }}
        >
          <Animated.View entering={entrance} style={{ gap: spacing.xs }}>
            <Text
              style={{
                color: colors.ink900,
                fontFamily: fontFamily.displayBold,
                fontSize: width >= 700 ? 36 : 32,
              }}
            >
              My Discoveries
            </Text>
            <Text
              style={{ color: colors.ink600, fontFamily: fontFamily.bodyRegular, fontSize: 16 }}
            >
              Look at everything you’ve discovered!
            </Text>
          </Animated.View>

          <Animated.View entering={entrance.delay(reducedMotion ? 0 : 60)}>
            <ExplorerSummary
              explorerName="Your discoveries"
              discoveredCount={totalDiscovered}
              availableCount={totalAvailable}
            />
          </Animated.View>

          {newestDiscoveryId ? (
            <Animated.View
              entering={FadeIn.duration(animationDurations.celebration)}
              style={{
                alignSelf: 'center',
                borderRadius: radius.pill,
                backgroundColor: colors.sunshine50,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={{
                  color: colors.sunshine700,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 13,
                }}
              >
                New Discovery added to My Discoveries
              </Text>
            </Animated.View>
          ) : null}

          {newestDiscovery ? (
            <Animated.View entering={entrance.delay(reducedMotion ? 0 : 90)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`New discovery. ${newestDiscovery.discovery.title}. ${newestDiscovery.discovery.funFact}. Tap to remember.`}
                onPress={() => {
                  setSelectedDiscoveryId(newestDiscovery.discovery.id);
                  setSelectedCollection(newestDiscovery.collection);
                }}
                style={({ pressed }) => ({
                  minHeight: 176,
                  flexDirection: width >= 520 ? 'row' : 'column',
                  alignItems: 'center',
                  gap: spacing.lg,
                  borderRadius: radius.xl,
                  padding: spacing.lg,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <DiscoveryIllustration
                  discovery={newestDiscovery.discovery}
                  size={Math.min(140, width * 0.34)}
                />
                <View
                  style={{
                    flex: 1,
                    gap: spacing.sm,
                    alignItems: width >= 520 ? 'flex-start' : 'center',
                  }}
                >
                  <Text
                    style={{
                      color: colors.sunshine700,
                      fontFamily: fontFamily.bodyExtraBold,
                      fontSize: 14,
                      textTransform: 'uppercase',
                    }}
                  >
                    New Discovery
                  </Text>
                  <Text
                    style={{
                      color: colors.ink900,
                      fontFamily: fontFamily.displaySemiBold,
                      fontSize: 24,
                    }}
                  >
                    {newestDiscovery.discovery.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.ink600,
                      fontFamily: fontFamily.bodyRegular,
                      fontSize: 16,
                      lineHeight: 23,
                      textAlign: width >= 520 ? 'left' : 'center',
                    }}
                  >
                    {newestDiscovery.discovery.funFact}
                  </Text>
                  <Text
                    style={{
                      color: colors.ocean700,
                      fontFamily: fontFamily.bodyExtraBold,
                      fontSize: 15,
                    }}
                  >
                    Tap to remember →
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ) : null}

          {featured ? (
            <Animated.View
              entering={entrance.delay(reducedMotion ? 0 : 120)}
              style={{ gap: spacing.md }}
            >
              <Text
                style={{
                  color: colors.ink900,
                  fontFamily: fontFamily.displaySemiBold,
                  fontSize: 22,
                }}
              >
                {featuredNextDiscovery
                  ? `Continue with ${featuredNextDiscovery.title}`
                  : 'Explore a World'}
              </Text>
              <FeaturedCollection collection={featured} onContinue={() => openWorld(featured)} />
            </Animated.View>
          ) : null}
        </View>

        {collections.length > 0 ? (
          <Animated.View
            entering={entrance.delay(reducedMotion ? 0 : 180)}
            style={{ gap: spacing.md }}
          >
            <Text
              style={{
                width: '100%',
                maxWidth: maxContentWidth,
                alignSelf: 'center',
                paddingHorizontal: horizontalPadding,
                color: colors.ink900,
                fontFamily: fontFamily.displaySemiBold,
                fontSize: 22,
              }}
            >
              Your Discovery Worlds
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: spacing.lg,
                paddingHorizontal: Math.max(
                  horizontalPadding,
                  (width - maxContentWidth) / 2 + horizontalPadding,
                ),
                paddingBottom: spacing.sm,
              }}
            >
              {collections.map((collection) => (
                <CollectionBookCard
                  key={collection.id}
                  collection={collection}
                  width={cardWidth}
                  onPress={() => {
                    setSelectedDiscoveryId(null);
                    setSelectedCollection(collection);
                  }}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <View
          style={{
            width: '100%',
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            paddingHorizontal: horizontalPadding,
            gap: spacing['2xl'],
          }}
        >
          {completedCollections.length > 0 ? (
            <Animated.View
              entering={entrance.delay(reducedMotion ? 0 : 240)}
              style={{ gap: spacing.md }}
            >
              <Text
                style={{
                  color: colors.ink900,
                  fontFamily: fontFamily.displaySemiBold,
                  fontSize: 22,
                }}
              >
                My Badges
              </Text>
              <View style={{ flexDirection: width >= 700 ? 'row' : 'column', gap: spacing.md }}>
                {completedCollections.map((collection) => (
                  <View key={collection.id} style={{ flex: 1 }}>
                    <WorldBadge
                      worldId={collection.category.id}
                      worldTitle={collection.category.title}
                      title={collection.deck.rewardBadge.label}
                      icon={collection.deck.rewardBadge.icon}
                    />
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            entering={entrance.delay(reducedMotion ? 0 : 300)}
            style={{
              borderRadius: radius.xl,
              backgroundColor: colors.ocean50,
              padding: spacing.xl,
              gap: spacing.md,
            }}
          >
            <Text
              style={{ color: colors.ink900, fontFamily: fontFamily.displaySemiBold, fontSize: 22 }}
            >
              Discover Something New
            </Text>
            <Text
              style={{
                color: colors.ink600,
                fontFamily: fontFamily.bodyRegular,
                fontSize: 16,
                lineHeight: 23,
              }}
            >
              {nextCollection
                ? nextCollection.status === 'locked'
                  ? `${nextCollection.deck.title} is a new world waiting to be explored.`
                  : `What amazing thing will you find in ${nextCollection.deck.title}?`
                : 'Choose a world and see what amazing thing you find next.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                nextCollection ? `Open ${nextCollection.deck.title}` : 'Choose a discovery world'
              }
              onPress={() => {
                if (nextCollection) {
                  setSelectedDiscoveryId(null);
                  setSelectedCollection(nextCollection);
                } else {
                  navigation.navigate('Explore', { screen: 'DiscoverySelection' });
                }
              }}
              style={{ minHeight: 52, alignSelf: 'flex-start', justifyContent: 'center' }}
            >
              <Text
                style={{
                  color: colors.ocean700,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 15,
                }}
              >
                {nextCollection?.status === 'locked'
                  ? 'Take a peek →'
                  : 'Choose your next discovery →'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>

      <CollectionDetailSheet
        collection={selectedCollection}
        newestDiscoveryId={newestDiscoveryId}
        initialDiscoveryId={selectedDiscoveryId}
        onSelectDiscovery={setSelectedDiscoveryId}
        onClose={() => {
          setSelectedDiscoveryId(null);
          setSelectedCollection(null);
        }}
        onContinue={() => selectedCollection && openWorld(selectedCollection)}
        onAskParent={() => {
          setSelectedDiscoveryId(null);
          setSelectedCollection(null);
          navigation.navigate('Parent', { screen: 'Area' });
        }}
      />
    </View>
  );
}
