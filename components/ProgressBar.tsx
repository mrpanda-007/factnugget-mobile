import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { animationDurations, colors } from '@constants/tokens';

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  color?: string;
  /** Rendered above the bar, e.g. "75% complete" — never inside it. */
  label?: string;
}

/** docs/design/02-component-architecture.md#progressbar */
export function ProgressBar({ progress, color = colors.ocean500, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(clamped, { duration: animationDurations.base });
  }, [clamped, fill]);

  // transform-only per docs/design/03-animation-strategy.md's performance rules —
  // a full-width bar scaled from the left edge, never an animated `width`.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {label ? (
        <Text className="mb-xs font-nunito-semibold text-body-sm text-ink-600">{label}</Text>
      ) : null}
      <View className="h-2 w-full overflow-hidden rounded-pill bg-sand">
        <Animated.View
          style={[animatedStyle, { backgroundColor: color, transformOrigin: 'left' }]}
          className="h-full w-full rounded-pill"
        />
      </View>
    </View>
  );
}
