import { Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@components/Button';
import { ChevronIcon } from '@components/icons';
import { ImageCarousel } from '@components/ImageCarousel';
import { animationDurations, springs, worldThemes } from '@constants/tokens';
import type { Discovery } from '@app-types/Discovery';

interface DiscoveryCardProps {
  discovery: Discovery;
  onNext: () => void;
  onPrevious?: () => void;
}

const SWIPE_DISTANCE_THRESHOLD = 90;
const SWIPE_VELOCITY_THRESHOLD = 700;

/**
 * The core learning-card museum piece — docs/design/02-component-architecture.md#discoverycard.
 * Shorts-style layout: a swipeable photo gallery (~60% of the card), a
 * single big fact (~30%), and a next affordance (~10%). The whole card
 * responds to a vertical swipe to advance or go back — the explicit button
 * stays too, since a gesture-only interaction isn't reliable enough on its
 * own for this age group's motor control.
 *
 * Render with `key={discovery.id}` from the caller: each discovery needs a
 * fresh mount so the drag position and gallery page reset, and so the
 * entrance animation replays per card.
 */
export function DiscoveryCard({ discovery, onNext, onPrevious }: DiscoveryCardProps) {
  const theme = worldThemes[discovery.category];
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();

  const translateY = useSharedValue(0);

  const contentHeight = windowHeight - insets.top - insets.bottom;
  const imageHeight = Math.round(contentHeight * 0.6);

  const finishAdvance = (direction: 'next' | 'previous') => {
    if (direction === 'next') {
      onNext();
    } else if (onPrevious) {
      onPrevious();
    }
  };

  // Vertical drag threshold to activate, horizontal drag threshold to yield
  // (to the image gallery's own horizontal ScrollView) — the standard
  // Gesture Handler pattern for nesting orthogonal pan gestures.
  const gesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onUpdate((event) => {
      if (event.translationY > 0 && !onPrevious) {
        translateY.value = event.translationY * 0.15; // slight resistance, not a hard stop
        return;
      }
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const swipingUp =
        event.translationY < -SWIPE_DISTANCE_THRESHOLD ||
        event.velocityY < -SWIPE_VELOCITY_THRESHOLD;
      const swipingDown =
        onPrevious &&
        (event.translationY > SWIPE_DISTANCE_THRESHOLD ||
          event.velocityY > SWIPE_VELOCITY_THRESHOLD);

      if (swipingUp) {
        translateY.value = withTiming(-contentHeight, { duration: 220 }, (finished) => {
          if (finished) runOnJS(finishAdvance)('next');
        });
      } else if (swipingDown) {
        translateY.value = withTiming(contentHeight, { duration: 220 }, (finished) => {
          if (finished) runOnJS(finishAdvance)('previous');
        });
      } else if (reducedMotion) {
        translateY.value = withTiming(0, { duration: animationDurations.fast });
      } else {
        translateY.value = withSpring(0, springs.gentle);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(animationDurations.base)}
        style={[cardStyle, { flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={{ height: imageHeight }}>
          <ImageCarousel
            images={discovery.images}
            emoji={discovery.emoji}
            theme={theme}
            height={imageHeight}
          />

          {onPrevious ? (
            <View className="absolute left-md top-md">
              <Button
                variant="icon"
                label="Back to previous discovery"
                onPress={onPrevious}
                icon={<ChevronIcon />}
              />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1 }} className="items-center justify-center gap-sm px-lg">
          <Text className="text-center font-fredoka-semibold text-display-md text-ink-600">
            {discovery.title}
          </Text>
          <Text className="text-center font-fredoka-bold text-display-xl text-ink-900">
            {discovery.funFact}
          </Text>
        </View>

        <View className="items-center gap-xs pb-lg">
          <Text className="font-nunito-semibold text-body-sm text-ink-400">Swipe up ↑</Text>
          <Button label="Next Discovery" onPress={onNext} color={theme.primary} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
