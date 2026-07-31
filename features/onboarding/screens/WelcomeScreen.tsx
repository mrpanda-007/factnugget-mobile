import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@components/Button';
import { ExplorerCharacter } from '@components/ExplorerCharacter';
import { IllustrationStage } from '@components/IllustrationStage';
import { WorldBackground } from '@components/WorldBackground';
import { animationDurations, worldThemes } from '@constants/tokens';
import type { OnboardingScreenProps } from '@navigation/types';

/**
 * First-run wonder moment — docs/design/01-screen-map.md. No login, no
 * email, no parent setup: the child experiences value before any commitment
 * (docs/product/02-user-flows.md Step 1).
 */
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    rotation.value = withRepeat(withTiming(360, { duration: 24000 }), -1, false);
  }, [reducedMotion, rotation]);

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

  const planetStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));

  return (
    <View className="flex-1 bg-cream">
      <WorldBackground world={worldThemes.earth} intensity="full" />

      <View className="flex-1 items-center justify-center gap-2xl px-xl">
        <Animated.View style={planetStyle}>
          <IllustrationStage emoji="🌎" theme={worldThemes.earth} size={180} shape="circle" />
        </Animated.View>

        <ExplorerCharacter state="wave" size={110} />

        <View className="items-center gap-sm">
          <Text className="font-fredoka-bold text-display-xl text-ink-900">Welcome Explorer</Text>
          <Text className="text-center font-nunito-semibold text-body-lg text-ink-600">
            Discover amazing things about our world.
          </Text>
        </View>

        <Animated.View style={ctaStyle} className="w-full">
          <Button
            label="START EXPLORING"
            size="large"
            onPress={() => navigation.navigate('ExplorerIdentity')}
          />
        </Animated.View>
      </View>
    </View>
  );
}
