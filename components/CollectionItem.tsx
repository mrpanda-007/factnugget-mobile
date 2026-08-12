import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { IllustrationStage } from '@components/IllustrationStage';
import { worldThemes } from '@constants/tokens';
import { usePressScale } from '@hooks/usePressScale';
import type { Discovery } from '@app-types/Discovery';

interface CollectionItemProps {
  discovery: Discovery;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A shelf tile in the Collection Screen — docs/design/02-component-architecture.md#collectionitem.
 * Shows the collected Discovery itself (`discoveryReward`/`emoji`), themed by
 * its World. Discoveries are the owned learning objects; World Badges are the
 * only separate child-facing achievement.
 */
export function CollectionItem({ discovery, onPress }: CollectionItemProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.95);
  const theme = worldThemes[discovery.category];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${discovery.discoveryReward.label} — tap to remember what you discovered`}
      style={animatedStyle}
      className="items-center gap-xs"
    >
      <IllustrationStage emoji={discovery.emoji} theme={theme} size={84} shape="circle" />
      <Text className="font-nunito-semibold text-body-sm text-ink-900" numberOfLines={1}>
        {discovery.discoveryReward.label}
      </Text>
    </AnimatedPressable>
  );
}
