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
  themeForWorldId,
  typeScale,
} from '@constants/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  summary: WorldSummary;
  height: number;
  onPress: () => void;
}

export function ExploreHeroCard({ summary, height, onPress }: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const theme = themeForWorldId(summary.world.themeKey);
  const hasProgress = typeof summary.discoveriesFound === 'number' && summary.discoveriesFound > 0;
  const inProgress = summary.status === 'in_progress';
  const completed = summary.status === 'completed';
  const action = summary.locked
    ? 'Grown-up Preview'
    : completed
      ? 'Visit Again'
      : inProgress
        ? summary.nextDiscoveryTitle
          ? hasProgress
            ? `Continue with ${summary.nextDiscoveryTitle}`
            : `Start with ${summary.nextDiscoveryTitle}`
          : `Visit ${summary.world.title}`
        : `Visit ${summary.world.title}`;
  const detail = summary.locked
    ? `${summary.discoveryCount} discoveries · Grown-up preview`
    : inProgress
      ? `${summary.discoveriesFound ?? 0} of ${summary.discoveryCount} discovered`
      : `${summary.discoveryCount} discoveries`;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${summary.world.title}. ${summary.pack.title}. ${detail}. ${action}.`}
      style={[
        elevation.raised,
        animatedStyle,
        { minHeight: height, borderRadius: radius.xl, backgroundColor: colors.surface },
      ]}
    >
      <View style={{ flex: 1, minHeight: height, borderRadius: radius.xl, overflow: 'hidden' }}>
        <WorldArtwork worldId={summary.world.themeKey} width="100%" height="100%" />
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
            <Text
              style={{
                color: colors.surface,
                fontFamily: fontFamily.bodyExtraBold,
                fontSize: 14,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
              }}
            >
              {summary.world.title}
            </Text>
            <Text style={[typeScale.displayLg, { color: colors.surface }]}>
              {summary.pack.title}
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
            {inProgress && summary.nextDiscoveryTitle && !completed ? (
              <Text
                style={{
                  color: colors.sunshine300,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 15,
                  lineHeight: 21,
                  textTransform: 'uppercase',
                }}
              >
                Next: {summary.nextDiscoveryTitle}
              </Text>
            ) : completed ? (
              <Text
                style={{
                  color: colors.sunshine300,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 15,
                }}
              >
                ✓ World complete
              </Text>
            ) : null}
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
              <Text style={{ marginRight: spacing.sm, color: colors.ink900, fontSize: 18 }}>
                🔒
              </Text>
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
