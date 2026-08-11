import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { islandScene, radius, touchTargets, typeScale } from '@constants/tokens';
import { usePressScale } from '@hooks/usePressScale';

interface StorybookButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The scene's only control — drawn like something inked into a field journal
 * rather than a platform button, so it belongs to the illustration.
 *
 * Two concentric strokes (a solid outline plus a faint inset one) give the
 * hand-drawn double-line look without a shadow; `components/Button` stays the
 * right choice everywhere else in the app, since it carries the world-themed
 * fill and elevation this scene deliberately drops.
 *
 * Press feedback comes from the shared `usePressScale` hook, which already
 * swaps scale for an opacity dim under reduced motion.
 */
export function StorybookButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
}: StorybookButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[
        animatedStyle,
        {
          minHeight: touchTargets.primary,
          minWidth: 200,
          paddingHorizontal: 32,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: islandScene.ink,
          backgroundColor: islandScene.paper,
        },
      ]}
    >
      {/* Inset second stroke — the "drawn twice" pencil line. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: islandScene.ink,
          opacity: 0.22,
        }}
      />
      <Text style={{ ...typeScale.displayMd, color: islandScene.ink }}>{label}</Text>
    </AnimatedPressable>
  );
}
