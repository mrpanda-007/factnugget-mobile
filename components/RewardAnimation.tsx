import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ExplorerCharacter } from '@components/ExplorerCharacter';
import { colors, elevation, springs } from '@constants/tokens';

interface RewardAnimationProps {
  /** e.g. { icon: '🏆', label: 'Ocean Explorer Badge' } — never a numeric score. */
  badge: { icon: string; label: string };
  /** Fires once the sequence finishes — this is what reveals "what next?". */
  onComplete: () => void;
}

const PARTICLE_COLORS = [colors.sunshine500, colors.coral500, colors.cosmic500, colors.ocean500];
const PARTICLE_COUNT = 8;

const particleConfigs = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (2 * Math.PI * i) / PARTICLE_COUNT;
  const distance = 70 + (i % 3) * 14;
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: i * 35,
  };
});

interface StarParticleProps {
  dx: number;
  dy: number;
  color: string;
  delay: number;
}

function StarParticle({ dx, dy, color, delay }: StarParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 380 }),
        withTiming(1, { duration: 220 }),
        withTiming(0, { duration: 260 }),
      ),
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const traveled = Math.min(progress.value, 1);
    return {
      opacity: progress.value,
      transform: [
        { translateX: dx * traveled },
        { translateY: dy * traveled + traveled * 24 },
        { scale: 0.6 + traveled * 0.6 },
        { rotate: `${traveled * 90}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, { position: 'absolute' }]} accessible={false}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M12 1L14.9 8.6L23 9.2L16.7 14.3L18.8 22.2L12 17.8L5.2 22.2L7.3 14.3L1 9.2L9.1 8.6L12 1Z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * The completion celebration sequence — docs/design/02-component-architecture.md#rewardanimation
 * and docs/design/03-animation-strategy.md#celebration-rewardanimation. Runs
 * once on mount; total sequence stays under the 2.5s target.
 */
export function RewardAnimation({ badge, onComplete }: RewardAnimationProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const containerScale = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    containerScale.value = withSpring(1, springs.bouncy);

    const particlesTimer = setTimeout(() => setPhase(1), 200);
    const badgeTimer = setTimeout(() => {
      setPhase(2);
      badgeScale.value = withSequence(
        withSpring(1.1, springs.bouncy),
        withSpring(1, springs.gentle),
      );
    }, 700);
    const completeTimer = setTimeout(onComplete, 1500);

    return () => {
      clearTimeout(particlesTimer);
      clearTimeout(badgeTimer);
      clearTimeout(completeTimer);
    };
  }, [containerScale, badgeScale, onComplete]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value > 0 ? 1 : 0,
  }));

  return (
    <View className="items-center justify-center gap-xl">
      <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          accessible={false}
          style={[
            containerStyle,
            elevation.floating,
            {
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: colors.sunshine50,
            },
          ]}
        />

        {phase >= 1
          ? particleConfigs.map((config, index) => <StarParticle key={index} {...config} />)
          : null}

        {phase >= 2 ? (
          <Animated.View style={[badgeStyle, { position: 'absolute' }]}>
            <Text style={{ fontSize: 64 }}>{badge.icon}</Text>
          </Animated.View>
        ) : null}
      </View>

      <ExplorerCharacter state={phase >= 1 ? 'celebrate' : 'idle'} size={120} />

      {phase >= 2 ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text className="font-fredoka-semibold text-display-md text-ink-900">{badge.label}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
