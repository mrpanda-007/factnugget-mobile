import { useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@components/Button';
import { WorldBackground } from '@components/WorldBackground';
import {
  animationDurations,
  colors,
  fontFamily,
  radius,
  spacing,
  themeForWorldId,
} from '@constants/tokens';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { WorldBadge } from '@features/rewards/components/WorldBadge';
import type { WorldSummary } from '@features/explore/hooks/useWorldSummaries';
import type { Discovery, World } from '@app-types/domain/content';

interface JourneyCompletionSceneProps {
  world: World;
  discoveries: Discovery[];
  badgeEarnedNow: boolean;
  nextWorld: WorldSummary | null;
  onSeeDiscoveries: () => void;
  onExploreNext: () => void;
}

/**
 * The completion route presents state that DiscoveryCardScreen already
 * persisted. Discoveries remain the achievement; the deck's single World Badge
 * is the only reward represented here or later in My Discoveries.
 */
export function JourneyCompletionScene({
  world,
  discoveries,
  badgeEarnedNow,
  nextWorld,
  onSeeDiscoveries,
  onExploreNext,
}: JourneyCompletionSceneProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const theme = themeForWorldId(world.themeKey);
  const worldTitle = world.title;
  const contentWidth = Math.min(width, 720);
  const horizontalPadding = width >= 700 ? spacing['2xl'] : spacing.lg;
  const discoveryWidth =
    width >= 620
      ? (contentWidth - horizontalPadding * 2 - spacing.md * 3) / 4
      : (contentWidth - horizontalPadding * 2 - spacing.md) / 2;

  useEffect(() => {
    const badgeDelay = reducedMotion || !badgeEarnedNow ? 0 : 650;
    const controlsDelay = reducedMotion ? 0 : badgeEarnedNow ? 1700 : 250;
    const completionAnnouncement = badgeEarnedNow
      ? `${worldTitle} complete. You found all ${discoveries.length} discoveries.`
      : `${worldTitle} explored again. ${world.badge.title} already earned.`;

    const announcementTimer = setTimeout(
      () => {
        AccessibilityInfo.announceForAccessibility(completionAnnouncement);
      },
      reducedMotion ? 50 : 180,
    );
    const badgeTimer = setTimeout(() => {
      setBadgeVisible(true);
      if (badgeEarnedNow && !reducedMotion) {
        AccessibilityInfo.announceForAccessibility(`${world.badge.title} earned.`);
      }
    }, badgeDelay);
    const controlsTimer = setTimeout(() => setControlsVisible(true), controlsDelay);

    return () => {
      clearTimeout(announcementTimer);
      clearTimeout(badgeTimer);
      clearTimeout(controlsTimer);
    };
  }, [badgeEarnedNow, world.badge.title, discoveries.length, reducedMotion, worldTitle]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <WorldBackground world={theme} intensity="subtle" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: horizontalPadding,
          paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing['3xl'],
          gap: spacing['2xl'],
        }}
      >
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(80) : FadeInUp.duration(420)}
          accessible
          accessibilityRole="header"
          style={{ alignItems: 'center', gap: spacing.sm }}
        >
          <Text
            style={{
              color: colors.ink900,
              fontFamily: fontFamily.displayBold,
              fontSize: width >= 700 ? 40 : 34,
              lineHeight: width >= 700 ? 48 : 41,
              textAlign: 'center',
            }}
          >
            {badgeEarnedNow ? `${worldTitle} Complete!` : `${worldTitle} explored again!`}
          </Text>
          <Text
            style={{
              color: colors.ink600,
              fontFamily: fontFamily.bodySemiBold,
              fontSize: 18,
              lineHeight: 26,
              textAlign: 'center',
            }}
          >
            {badgeEarnedNow
              ? `You found all ${discoveries.length} discoveries.`
              : 'You revisited every discovery.'}
          </Text>
        </Animated.View>

        <Animated.View
          entering={
            reducedMotion
              ? FadeIn.duration(80)
              : FadeInUp.delay(220).duration(animationDurations.slow)
          }
          style={{ gap: spacing.md }}
        >
          <Text
            style={{
              color: colors.ink900,
              fontFamily: fontFamily.displaySemiBold,
              fontSize: 22,
              textAlign: 'center',
            }}
          >
            Everything you discovered
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {discoveries.map((discovery) => (
              <View
                key={discovery.id}
                accessible
                accessibilityLabel={`${discovery.title}. In My Discoveries.`}
                style={{
                  width: discoveryWidth,
                  flexGrow: 1,
                  alignItems: 'center',
                  gap: spacing.sm,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  backgroundColor: colors.surface,
                }}
              >
                <DiscoveryIllustration
                  discovery={discovery}
                  worldId={world.themeKey}
                  size={Math.min(discoveryWidth * 0.68, 96)}
                />
                <Text
                  style={{
                    color: colors.ink900,
                    fontFamily: fontFamily.bodyExtraBold,
                    fontSize: 15,
                    lineHeight: 20,
                    textAlign: 'center',
                  }}
                >
                  {discovery.title}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {badgeVisible ? (
          <Animated.View
            entering={
              reducedMotion ? FadeIn.duration(80) : FadeInUp.duration(700).springify().damping(16)
            }
            style={{ gap: spacing.md }}
          >
            <WorldBadge
              worldId={world.themeKey}
              worldTitle={worldTitle}
              title={world.badge.title}
              icon={world.badge.icon}
              variant="hero"
              statusLabel={badgeEarnedNow ? 'Badge earned' : 'Badge already earned'}
            />
            <Text
              style={{
                color: colors.ink600,
                fontFamily: fontFamily.bodySemiBold,
                fontSize: 16,
                lineHeight: 23,
                textAlign: 'center',
              }}
            >
              {badgeEarnedNow
                ? `You discovered every ${worldTitle.replace(' World', '')} secret.`
                : 'This Badge stays with you in My Discoveries.'}
            </Text>
          </Animated.View>
        ) : null}

        {controlsVisible ? (
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(80) : FadeInUp.duration(360)}
            style={{ gap: spacing.md }}
          >
            <Button label="SEE MY DISCOVERIES" size="large" onPress={onSeeDiscoveries} />
            <Button
              label={
                nextWorld
                  ? `EXPLORE ${nextWorld.world.title.toLocaleUpperCase()}`
                  : 'EXPLORE ANOTHER WORLD'
              }
              variant="secondary"
              color={theme.primary}
              onPress={onExploreNext}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}
