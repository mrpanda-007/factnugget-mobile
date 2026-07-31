import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { animationDurations, colors, springs } from '@constants/tokens';

export type CharacterState = 'idle' | 'wave' | 'blink' | 'celebrate';

interface ExplorerCharacterProps {
  state: CharacterState;
  size?: number;
}

const stateLabel: Record<CharacterState, string> = {
  idle: 'Your explorer guide',
  blink: 'Your explorer guide',
  wave: 'Your explorer guide waving hello',
  celebrate: 'Your explorer guide celebrating',
};

/**
 * The mascot — docs/design/02-component-architecture.md#explorercharacter.
 * Built from plain Views (circles/capsules) rather than SVG or a bitmap
 * sprite sheet, per docs/design/04-asset-strategy.md#mascot-strategy — its
 * four states are just transform animations on the same shape layers.
 */
export function ExplorerCharacter({ state, size = 160 }: ExplorerCharacterProps) {
  const reducedMotion = useReducedMotion();
  const breathe = useSharedValue(1);
  const bounce = useSharedValue(0);
  const eyeScaleY = useSharedValue(1);
  const armRotate = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: animationDurations.ambient }),
        withTiming(1, { duration: animationDurations.ambient }),
      ),
      -1,
      true,
    );
  }, [reducedMotion, breathe]);

  useEffect(() => {
    if (reducedMotion) return;

    const doBlink = () => {
      eyeScaleY.value = withSequence(
        withTiming(0.1, { duration: 90 }),
        withTiming(1, { duration: 120 }),
      );
    };

    if (state === 'blink') {
      doBlink();
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timeoutId = setTimeout(
        () => {
          doBlink();
          scheduleNext();
        },
        2200 + Math.random() * 2600,
      );
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [state, reducedMotion, eyeScaleY]);

  useEffect(() => {
    // Owns armRotate exclusively — both 'wave' and 'celebrate' drive the same
    // shared value, so that has to happen from one effect, not two.
    if (state === 'wave') {
      if (reducedMotion) {
        armRotate.value = -20;
        return;
      }
      armRotate.value = withSequence(
        withTiming(-30, { duration: 200 }),
        withRepeat(withTiming(-5, { duration: 200 }), 3, true),
        withTiming(0, { duration: 200 }),
      );
      return;
    }

    if (state === 'celebrate') {
      if (reducedMotion) {
        armRotate.value = -60;
        return;
      }
      armRotate.value = withSequence(
        withSpring(-60, springs.bouncy),
        withDelay(400, withSpring(0, springs.bouncy)),
      );
    }
  }, [state, reducedMotion, armRotate]);

  useEffect(() => {
    if (state !== 'celebrate') return;
    if (reducedMotion) {
      bounce.value = withTiming(-10, { duration: animationDurations.fast });
      return;
    }
    bounce.value = withSequence(
      withSpring(-size * 0.12, springs.bouncy),
      withSpring(0, springs.bouncy),
    );
  }, [state, reducedMotion, bounce, size]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }, { scale: breathe.value }],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: eyeScaleY.value }],
  }));

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armRotate.value}deg` }],
  }));

  const bodySize = size * 0.72;
  const eyeSize = size * 0.09;
  const cheekSize = size * 0.14;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={stateLabel[state]}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          bodyStyle,
          {
            width: bodySize,
            height: bodySize,
            borderRadius: bodySize / 2,
            backgroundColor: colors.sunshine500,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            bottom: bodySize * 0.28,
            left: bodySize * 0.12,
            width: cheekSize,
            height: cheekSize,
            borderRadius: cheekSize / 2,
            backgroundColor: colors.coral300,
            opacity: 0.7,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: bodySize * 0.28,
            right: bodySize * 0.12,
            width: cheekSize,
            height: cheekSize,
            borderRadius: cheekSize / 2,
            backgroundColor: colors.coral300,
            opacity: 0.7,
          }}
        />
        <View style={{ flexDirection: 'row', gap: bodySize * 0.16, marginBottom: bodySize * 0.08 }}>
          <Animated.View
            style={[
              eyeStyle,
              {
                width: eyeSize,
                height: eyeSize * 1.3,
                borderRadius: eyeSize,
                backgroundColor: colors.ink900,
              },
            ]}
          />
          <Animated.View
            style={[
              eyeStyle,
              {
                width: eyeSize,
                height: eyeSize * 1.3,
                borderRadius: eyeSize,
                backgroundColor: colors.ink900,
              },
            ]}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          armStyle,
          {
            position: 'absolute',
            right: size * 0.06,
            top: size * 0.32,
            width: size * 0.12,
            height: size * 0.32,
            borderRadius: size * 0.06,
            backgroundColor: colors.sunshine700,
            transformOrigin: 'top',
          },
        ]}
      />
    </View>
  );
}
