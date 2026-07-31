import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { elevation as elevationTokens } from '@constants/tokens';
import { usePressScale } from '@hooks/usePressScale';

export type CardElevation = 'resting' | 'raised' | 'floating';
type CardRadius = 'md' | 'lg' | 'xl';
type CardPadding = 'md' | 'lg' | 'xl';

interface CardProps extends PropsWithChildren {
  elevation?: CardElevation;
  radius?: CardRadius;
  padding?: CardPadding;
  onPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const radiusClassName: Record<CardRadius, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

const paddingClassName: Record<CardPadding, string> = {
  md: 'p-md',
  lg: 'p-lg',
  xl: 'p-xl',
};

/**
 * Base surface primitive other cards compose — docs/design/02-component-architecture.md#card.
 * Pressable only when `onPress` is provided; otherwise a plain static surface.
 *
 * Two layers under the hood: the outer node carries the shadow (shadows need
 * `overflow: visible`), the inner node clips content to the radius (needs
 * `overflow: hidden`, e.g. so a CategoryCard's WorldBackground doesn't bleed
 * past the rounded corners) — React Native can't do both on a single node.
 */
export function Card({
  children,
  elevation = 'resting',
  radius = 'lg',
  padding = 'lg',
  onPress,
  className = '',
  accessibilityLabel,
}: CardProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const shadow = elevationTokens[elevation];
  const innerClasses = `overflow-hidden bg-surface ${radiusClassName[radius]} ${paddingClassName[padding]} ${className}`;

  if (!onPress) {
    return (
      <View style={shadow} className={radiusClassName[radius]}>
        <View className={innerClasses}>{children}</View>
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[shadow, animatedStyle]}
      className={radiusClassName[radius]}
    >
      <View className={innerClasses}>{children}</View>
    </AnimatedPressable>
  );
}
