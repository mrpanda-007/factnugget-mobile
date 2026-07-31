import { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { animationDurations, colors, type WorldTheme } from '@constants/tokens';

interface WorldBackgroundProps {
  world: WorldTheme;
  /** 'subtle' behind readable content, 'full' on hero moments. */
  intensity?: 'subtle' | 'full';
}

type Percent = `${number}%`;

interface FloaterConfig {
  size: number;
  left: Percent;
  top: Percent;
  opacity: number;
  delay: number;
}

interface FloaterProps extends FloaterConfig {
  color: string;
  opacityMultiplier: number;
}

function Floater({ size, left, top, opacity, delay, color, opacityMultiplier }: FloaterProps) {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-16, { duration: animationDurations.ambient }),
          withTiming(0, { duration: animationDurations.ambient }),
        ),
        -1,
        true,
      ),
    );
  }, [reducedMotion, delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacity * opacityMultiplier,
        },
      ]}
    />
  );
}

// Ocean: bubbles drifting up. Space: distant stars. Dinosaur/Animal/Earth
// aren't built out yet (docs/design/01-screen-map.md Slice D only adds
// Space) — they fall back to the ocean bubble set, which is harmless until
// those worlds get their own bespoke floaters.
const oceanFloaters: FloaterConfig[] = [
  { size: 18, left: '12%', top: '70%', opacity: 0.5, delay: 0 },
  { size: 12, left: '78%', top: '55%', opacity: 0.4, delay: 600 },
  { size: 22, left: '55%', top: '80%', opacity: 0.35, delay: 1200 },
  { size: 10, left: '30%', top: '40%', opacity: 0.4, delay: 300 },
];

const spaceFloaters: FloaterConfig[] = [
  { size: 4, left: '15%', top: '20%', opacity: 0.9, delay: 0 },
  { size: 3, left: '70%', top: '15%', opacity: 0.8, delay: 500 },
  { size: 5, left: '85%', top: '45%', opacity: 0.7, delay: 900 },
  { size: 3, left: '40%', top: '10%', opacity: 0.85, delay: 200 },
  { size: 4, left: '25%', top: '60%', opacity: 0.6, delay: 1100 },
];

/** Per-world animated environment backdrop — docs/design/02-component-architecture.md#worldbackground. */
export function WorldBackground({ world, intensity = 'subtle' }: WorldBackgroundProps) {
  const floaters = world.id === 'space' ? spaceFloaters : oceanFloaters;
  const floaterColor = world.id === 'space' ? '#FFFFFF' : colors.surface;
  const opacityMultiplier = intensity === 'full' ? 1 : 0.6;

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      <LinearGradient
        colors={[world.tint, world.background]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {floaters.map((floater, index) => (
        <Floater
          key={index}
          {...floater}
          color={floaterColor}
          opacityMultiplier={opacityMultiplier}
        />
      ))}
    </View>
  );
}
