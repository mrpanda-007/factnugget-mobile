import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { ProgressBar } from '@components/ProgressBar';
import { WorldArtwork } from '@components/WorldArtwork';
import type { WorldSummary } from '@features/explore/hooks/useWorldSummaries';
import { usePressScale } from '@hooks/usePressScale';
import {
  colors,
  elevation,
  fontFamily,
  radius,
  spacing,
  typeScale,
  worldThemes,
} from '@constants/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  summary: WorldSummary;
  height: number;
  onPress: () => void;
}

export function ExploreHeroCard({ summary, height, onPress }: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const theme = worldThemes[summary.category.id];
  const hasProgress = typeof summary.discoveriesFound === 'number' && summary.discoveriesFound > 0;
  const completed = summary.status === 'completed';
  const action = summary.locked
    ? 'Ask a Parent'
    : completed
      ? `Explore ${summary.category.title.replace(' World', '')} Again`
      : hasProgress
        ? summary.nextDiscoveryTitle
          ? `Continue with ${summary.nextDiscoveryTitle}`
          : 'Continue Exploring'
        : `Explore ${summary.category.title.replace(' World', '')}`;
  const detail = summary.locked
    ? 'A new world to discover'
    : hasProgress
      ? `${summary.discoveriesFound} of ${summary.deck.discoveryIds.length} discoveries found`
      : summary.category.tagline;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${summary.deck.title}. ${detail}. ${action}.`}
      style={[
        elevation.raised,
        animatedStyle,
        { minHeight: height, borderRadius: radius.xl, backgroundColor: colors.surface },
      ]}
    >
      <View style={{ flex: 1, minHeight: height, borderRadius: radius.xl, overflow: 'hidden' }}>
        <WorldArtwork worldId={summary.category.id} width="100%" height="100%" />
        <LinearGradient
          colors={['transparent', `${colors.ink900}E8`]}
          locations={[0.24, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            left: spacing.xl,
            right: spacing.xl,
            bottom: spacing.xl,
            gap: spacing.md,
          }}
        >
          <View style={{ gap: spacing.xs }}>
            <Text style={[typeScale.displayLg, { color: colors.surface }]}>
              {summary.deck.title}
            </Text>
            <Text
              style={{
                color: colors.surface,
                fontFamily: fontFamily.bodySemiBold,
                fontSize: 16,
                lineHeight: 22,
              }}
              numberOfLines={2}
            >
              {detail}
            </Text>
          </View>
          {hasProgress && !summary.locked ? (
            <ProgressBar progress={summary.progress ?? 0} color={theme.secondary} />
          ) : null}
          <View
            style={{
              minHeight: 52,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.xl,
            }}
          >
            {summary.locked ? (
              <Text style={{ marginRight: spacing.sm, color: colors.ink900, fontSize: 18 }}>⌾</Text>
            ) : null}
            <Text
              style={{ color: theme.primary, fontFamily: fontFamily.bodyExtraBold, fontSize: 15 }}
            >
              {action} →
            </Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
