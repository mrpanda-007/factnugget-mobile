import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { WorldArtwork } from '@components/WorldArtwork';
import { usePressScale } from '@hooks/usePressScale';
import { colors, elevation, fontFamily, radius, spacing, worldThemes } from '@constants/tokens';
import type { ExplorerCollection } from '@features/collection/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  collection: ExplorerCollection;
  width: number;
  onPress: () => void;
}

export function CollectionBookCard({ collection, width, onPress }: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.98);
  const theme = worldThemes[collection.category.id];
  const locked = collection.status === 'locked';
  const completed = collection.status === 'completed';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${collection.deck.title}. ${locked ? 'A new world to discover. Grown-up preview available.' : `${collection.discoveredCount} of ${collection.totalCount} discoveries found.`}`}
      style={[
        elevation.resting,
        animatedStyle,
        { width, borderRadius: radius.lg, backgroundColor: colors.surface },
      ]}
    >
      <View
        style={{
          height: 148,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <WorldArtwork worldId={collection.category.id} width="100%" height="100%" />
        {completed ? (
          <View
            style={{
              position: 'absolute',
              right: spacing.md,
              top: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: colors.sunshine500,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text
              style={{ color: colors.ink900, fontFamily: fontFamily.bodyExtraBold, fontSize: 11 }}
            >
              Complete
            </Text>
          </View>
        ) : null}
        {locked ? (
          <View
            style={{
              position: 'absolute',
              right: spacing.md,
              top: spacing.md,
              width: 38,
              height: 38,
              borderRadius: 19,
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
      <View style={{ minHeight: 116, padding: spacing.lg, gap: spacing.sm }}>
        <Text
          style={{ color: colors.ink900, fontFamily: fontFamily.displaySemiBold, fontSize: 20 }}
          numberOfLines={1}
        >
          {collection.deck.title}
        </Text>
        <Text
          style={{ color: colors.ink600, fontFamily: fontFamily.bodySemiBold, fontSize: 13 }}
          numberOfLines={2}
        >
          {locked ? 'A new world to discover' : `${collection.discoveredCount} in My Discoveries`}
        </Text>
        <View
          style={{
            height: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.sand,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${locked ? 0 : collection.progress * 100}%`,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: theme.primary,
            }}
          />
        </View>
      </View>
    </AnimatedPressable>
  );
}
