import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { WorldArtwork } from '@components/WorldArtwork';
import type { WorldSummary } from '@features/explore/hooks/useWorldSummaries';
import { usePressScale } from '@hooks/usePressScale';
import { colors, elevation, fontFamily, radius, spacing, worldThemes } from '@constants/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  summary: WorldSummary;
  width: number;
  artworkHeight: number;
  onPress: () => void;
}

export function WorldChoiceCard({ summary, width, artworkHeight, onPress }: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const theme = worldThemes[summary.category.id];
  const count = summary.discoveriesFound ?? 0;
  const detail = summary.locked
    ? 'A new world to discover'
    : count > 0
      ? `${count} of ${summary.deck.discoveryIds.length} found`
      : summary.deck.subtitle;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${summary.deck.title}. ${detail}.`}
      style={[
        elevation.resting,
        animatedStyle,
        { width, borderRadius: radius.lg, backgroundColor: colors.surface },
      ]}
    >
      <View
        style={{
          height: artworkHeight,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <WorldArtwork worldId={summary.category.id} width="100%" height="100%" />
        {summary.locked ? (
          <View
            style={{
              position: 'absolute',
              right: spacing.md,
              top: spacing.md,
              minWidth: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: `${colors.surface}EE`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{ color: colors.ink900, fontFamily: fontFamily.bodyExtraBold, fontSize: 18 }}
            >
              ⌾
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ minHeight: 118, padding: spacing.lg, gap: spacing.sm }}>
        <Text
          style={{ color: colors.ink900, fontFamily: fontFamily.displaySemiBold, fontSize: 20 }}
          numberOfLines={1}
        >
          {summary.deck.title}
        </Text>
        <Text
          style={{
            flex: 1,
            color: colors.ink600,
            fontFamily: fontFamily.bodySemiBold,
            fontSize: 13,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {detail}
        </Text>
        {!summary.locked && count > 0 ? (
          <View
            accessible={false}
            style={{
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: colors.sand,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${(summary.progress ?? 0) * 100}%`,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: theme.primary,
              }}
            />
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
