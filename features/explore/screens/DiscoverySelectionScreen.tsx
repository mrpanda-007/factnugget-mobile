import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { ExploreHeroCard } from '@features/explore/components/ExploreHeroCard';
import { WorldChoiceCard } from '@features/explore/components/WorldChoiceCard';
import { useWorldSummaries, type WorldSummary } from '@features/explore/hooks/useWorldSummaries';
import { animationDurations, colors, fontFamily, spacing, typeScale } from '@constants/tokens';
import { useExplorerStore } from '@store/useExplorerStore';
import type { ExploreScreenProps } from '@navigation/types';

function chooseHero(summaries: WorldSummary[]) {
  const inProgress = summaries
    .filter((summary) => summary.status === 'in_progress')
    .sort((left, right) => (right.lastViewedAt ?? '').localeCompare(left.lastViewedAt ?? ''));
  return (
    inProgress[0] ??
    summaries.find((summary) => summary.status === 'not_started') ??
    summaries.find((summary) => summary.status === 'completed') ??
    summaries[0] ??
    null
  );
}

export function DiscoverySelectionScreen({ navigation }: ExploreScreenProps<'DiscoverySelection'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const identity = useExplorerStore((state) => state.identity);
  const { summaries, isLoading, loadFailed, refresh } = useWorldSummaries();
  const hero = useMemo(() => chooseHero(summaries), [summaries]);
  const otherWorlds = useMemo(
    () => summaries.filter((summary) => summary.pack.id !== hero?.pack.id).slice(0, 3),
    [hero, summaries],
  );
  const returning = summaries.some(
    (summary) => summary.status === 'in_progress' || summary.status === 'completed',
  );

  const tablet = width >= 700;
  const maxContentWidth = tablet ? 960 : 680;
  const horizontalPadding = tablet ? spacing['2xl'] : spacing.lg;
  const availableWidth = Math.min(width, maxContentWidth) - horizontalPadding * 2;
  const cardWidth =
    otherWorlds.length === 1 && !tablet ? availableWidth : (availableWidth - spacing.lg) / 2;
  const heroHeight = tablet ? 410 : 350;
  const cardArtworkHeight = tablet ? 190 : otherWorlds.length === 1 ? 190 : 128;
  const entrance = reducedMotion
    ? FadeIn.duration(animationDurations.fast)
    : FadeInUp.duration(animationDurations.slow);

  const openWorld = (summary: WorldSummary) => {
    if (summary.locked) {
      navigation.navigate('Parent', {
        screen: 'Area',
        params: {
          deckId: summary.pack.id,
          requestedPackTitle: summary.pack.title,
          requestId: String(Date.now()),
        },
      });
      return;
    }
    if (summary.status === 'in_progress' && summary.nextDiscoveryId) {
      navigation.navigate('DiscoveryCard', {
        deckId: summary.pack.id,
        discoveryId: summary.nextDiscoveryId,
      });
      return;
    }
    navigation.navigate('WorldHome', { worldId: summary.world.id });
  };

  if (isLoading && summaries.length === 0) {
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
        <Text style={[typeScale.bodyMd, { color: colors.ink600 }]}>Finding amazing worlds…</Text>
      </View>
    );
  }

  if (loadFailed && summaries.length === 0) {
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
        <Text style={[typeScale.displayMd, { color: colors.ink900, textAlign: 'center' }]}>
          Explore needs a moment.
        </Text>
        <Text style={[typeScale.bodyMd, { color: colors.ink600, textAlign: 'center' }]}>
          Your discoveries are safe. Let’s try Explore again.
        </Text>
        <Button label="Try Again" onPress={refresh} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cream }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: spacing['4xl'],
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
        <Animated.View entering={entrance} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            {identity ? <Avatar identity={identity} size={52} /> : null}
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.ink600,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                {returning ? 'Welcome back, Explorer' : 'Welcome, Explorer'}
              </Text>
              <Text
                style={{
                  color: colors.ink900,
                  fontFamily: fontFamily.displayBold,
                  fontSize: tablet ? 38 : 32,
                  lineHeight: tablet ? 45 : 38,
                }}
              >
                {returning ? 'Your next discovery is waiting.' : 'What should we discover today?'}
              </Text>
            </View>
          </View>
          {!returning ? (
            <Text style={[typeScale.bodyMd, { color: colors.ink600 }]}>
              Choose a world and find something amazing.
            </Text>
          ) : null}
        </Animated.View>

        {hero ? (
          <Animated.View entering={entrance.delay(reducedMotion ? 0 : 80)}>
            <ExploreHeroCard summary={hero} height={heroHeight} onPress={() => openWorld(hero)} />
          </Animated.View>
        ) : null}

        {otherWorlds.length > 0 ? (
          <Animated.View
            entering={entrance.delay(reducedMotion ? 0 : 150)}
            style={{ gap: spacing.lg }}
          >
            <Text style={[typeScale.displayMd, { color: colors.ink900 }]}>
              {returning ? 'Or discover somewhere new' : 'More worlds to discover'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
              {otherWorlds.map((summary, index) => (
                <Animated.View
                  key={summary.pack.id}
                  entering={entrance.delay(reducedMotion ? 0 : 190 + index * 60)}
                >
                  <WorldChoiceCard
                    summary={summary}
                    width={cardWidth}
                    artworkHeight={cardArtworkHeight}
                    onPress={() => openWorld(summary)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ScrollView>
  );
}
