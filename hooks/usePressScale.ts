import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { animationDurations, springs } from '@constants/tokens';

/**
 * Standard tap feedback for every pressable surface (Button, Card, CategoryCard,
 * DiscoveryCard, CollectionItem, Sticker) — docs/design/03-animation-strategy.md
 * "Button / tappable card press". One hook so every surface gets the same
 * physics and the same reduced-motion fallback (opacity dim, no scale)
 * automatically, instead of six components re-implementing it slightly
 * differently.
 *
 * The handlers are deliberately plain functions rather than `useCallback`:
 * listing a shared value in a dependency array passes it as a hook argument,
 * after which `react-hooks/immutability` forbids writing to it. There is
 * nothing to memoize against anyway — `useSharedValue` returns a stable ref,
 * and these handlers are consumed by a plain `Pressable`, which isn't memoized.
 */
export function usePressScale(pressedScale = 0.96) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const onPressIn = () => {
    if (reducedMotion) {
      opacity.value = withTiming(0.7, { duration: animationDurations.fast });
    } else {
      scale.value = withSpring(pressedScale, springs.snappy);
    }
  };

  const onPressOut = () => {
    if (reducedMotion) {
      opacity.value = withTiming(1, { duration: animationDurations.fast });
    } else {
      scale.value = withSpring(1, springs.snappy);
    }
  };

  // Declared after the handlers on purpose: capturing a shared value in a hook
  // freezes it for react-hooks/immutability, so any write declared afterwards
  // is reported as mutating an immutable value.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { animatedStyle, onPressIn, onPressOut };
}
