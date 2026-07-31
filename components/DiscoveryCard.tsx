import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@components/Button';
import { ChevronIcon } from '@components/icons';
import { IllustrationStage } from '@components/IllustrationStage';
import { animationDurations, spacing, worldThemes } from '@constants/tokens';
import { usePressScale } from '@hooks/usePressScale';
import type { Discovery } from '@app-types/Discovery';

interface DiscoveryCardProps {
  discovery: Discovery;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
  onPrevious?: () => void;
}

/** The core learning-card museum piece — docs/design/02-component-architecture.md#discoverycard */
export function DiscoveryCard({
  discovery,
  revealed,
  onReveal,
  onNext,
  onPrevious,
}: DiscoveryCardProps) {
  const theme = worldThemes[discovery.category];
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.98);
  // This screen has no header and renders edge-to-edge, so the illustration
  // collides with the status bar / Dynamic Island without an explicit inset.
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center gap-xl px-lg pb-xl"
      style={{ paddingTop: insets.top + spacing.md }}
    >
      {onPrevious ? (
        <View className="w-full">
          <Button
            variant="icon"
            label="Back to previous discovery"
            onPress={onPrevious}
            icon={<ChevronIcon />}
          />
        </View>
      ) : null}

      <Animated.View style={pressStyle}>
        <Pressable
          onPress={onReveal}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={`${discovery.title} illustration. Tap to reveal more.`}
        >
          <IllustrationStage
            emoji={discovery.emoji}
            imageUrl={discovery.heroImage}
            theme={theme}
            size={200}
          />
        </Pressable>
      </Animated.View>

      <View className="items-center gap-sm">
        <Text className="font-fredoka-semibold text-display-lg text-ink-900">
          {discovery.title}
        </Text>
        <Text className="text-center font-nunito-semibold text-body-lg text-ink-900">
          {discovery.funFact}
        </Text>
      </View>

      <View className="w-full flex-1 items-center justify-end gap-lg">
        {revealed ? (
          <Animated.View
            entering={FadeInDown.duration(animationDurations.slow)}
            className="w-full items-center gap-lg"
          >
            <Text className="text-center font-nunito-regular text-body-md text-ink-600">
              {discovery.easyDescription}
            </Text>
            <Button label="Next Discovery" onPress={onNext} size="large" color={theme.primary} />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(animationDurations.base)}
            exiting={FadeOut.duration(animationDurations.fast)}
          >
            <Text className="text-center font-nunito-semibold text-body-sm text-ink-400">
              Tap the picture to discover more
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
