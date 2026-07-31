import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { WorldTheme } from '@constants/tokens';
import { elevation, radius } from '@constants/tokens';

interface IllustrationStageProps {
  /** Always present — the guaranteed placeholder fallback. */
  emoji: string;
  /** Real Sanity-delivered artwork, once docs/implementation/04-content-platform.md ships. */
  imageUrl?: string | null;
  theme: WorldTheme;
  size?: number;
  shape?: 'rounded' | 'circle';
}

/**
 * Shape + gradient + emoji composition used by DiscoveryCard, CategoryCard,
 * Avatar, and Sticker — docs/design/04-asset-strategy.md#illustration-placeholder-system.
 * Not part of the public component list (docs/design/02-component-architecture.md) —
 * this is an internal building block those components share, not a
 * screen-facing component on its own. Purely decorative: the consuming
 * component supplies the real `accessibilityLabel`.
 */
export function IllustrationStage({
  emoji,
  imageUrl,
  theme,
  size = 140,
  shape = 'rounded',
}: IllustrationStageProps) {
  const borderRadius = shape === 'circle' ? size / 2 : radius.xl;
  const dotSize = size * 0.06;

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[elevation.floating, { width: size, height: size, borderRadius }]}
    >
      <LinearGradient
        colors={[theme.tint, theme.primary]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: size * 0.14,
            bottom: size * 0.16,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: '#FFFFFF',
            opacity: 0.35,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: size * 0.16,
            top: size * 0.14,
            width: dotSize * 0.7,
            height: dotSize * 0.7,
            borderRadius: dotSize / 2,
            backgroundColor: '#FFFFFF',
            opacity: 0.3,
          }}
        />
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: size * 0.65, height: size * 0.65 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
        )}
      </LinearGradient>
    </View>
  );
}
