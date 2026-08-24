import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdventureBackdrop } from '@components/DiscoveryAdventureScene';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { animationDurations, fontFamily, springs, themeForWorldId } from '@constants/tokens';
import type { Discovery } from '@app-types/domain/content';

interface DiscoveryCardProps {
  discovery: Discovery;
  /**
   * A World's themeKey (preferred) or id — the canonical Discovery is
   * deliberately world-agnostic, so the theme context must come from the
   * caller's own World/Pack scope. See constants/tokens.ts#themeForWorldId.
   */
  worldId: string;
  position: number;
  total: number;
  canGoBack: boolean;
  isSaving: boolean;
  saveFailed: boolean;
  enterFrom: 'left' | 'right';
  onSwipeNext: () => void;
  onSwipeBack: () => void;
  onClose: () => void;
}

const SWIPE_COMMIT_RATIO = 0.25;
const SWIPE_VELOCITY_THRESHOLD = 800;

/** The fact is visible immediately; progress persists as the user swipes forward. */
export function DiscoveryCard({
  discovery,
  worldId,
  position,
  total,
  canGoBack,
  isSaving,
  saveFailed,
  enterFrom,
  onSwipeNext,
  onSwipeBack,
  onClose,
}: DiscoveryCardProps) {
  const theme = themeForWorldId(worldId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const cardWidth = Math.min(width - 36, 430);
  const cardHeight = Math.min(Math.max(height - insets.top - insets.bottom - 136, 470), 620);
  const artworkSize = Math.min(cardWidth * 0.58, 220);

  const translateX = useSharedValue(0);
  const exitDistance = cardWidth * 1.4;

  const commitNext = () => {
    if (isSaving) {
      translateX.value = withSpring(0, springs.snappy);
      return;
    }
    translateX.value = withTiming(
      -exitDistance,
      { duration: animationDurations.base },
      (finished) => {
        if (finished) runOnJS(onSwipeNext)();
      },
    );
  };

  const commitBack = () => {
    if (!canGoBack) {
      translateX.value = withSpring(0, springs.snappy);
      return;
    }
    translateX.value = withTiming(
      exitDistance,
      { duration: animationDurations.base },
      (finished) => {
        if (finished) runOnJS(onSwipeBack)();
      },
    );
  };

  const cancelSwipe = () => {
    translateX.value = withSpring(0, springs.snappy);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const commitThreshold = cardWidth * SWIPE_COMMIT_RATIO;
      const commitsForward =
        event.translationX < -commitThreshold || event.velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const commitsBack =
        event.translationX > commitThreshold || event.velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (commitsForward) {
        runOnJS(commitNext)();
      } else if (commitsBack) {
        runOnJS(commitBack)();
      } else {
        runOnJS(cancelSwipe)();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <AdventureBackdrop worldId={worldId} />
      </View>

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close discovery"
          onPress={onClose}
          hitSlop={8}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Text style={styles.progressText}>
          Discovery {position} of {total}
        </Text>
        <Text style={styles.worldText}>{theme.label}</Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          entering={enterFrom === 'left' ? SlideInLeft : SlideInRight}
          style={[
            styles.cardFrame,
            {
              width: cardWidth,
              height: cardHeight,
              top: insets.top + 72,
            },
            cardStyle,
          ]}
        >
          <View style={styles.face}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${discovery.title} artwork`}
              style={styles.artwork}
            >
              <DiscoveryIllustration discovery={discovery} worldId={worldId} size={artworkSize} />
            </View>
            <Text style={styles.title}>{discovery.title}</Text>
            <Text style={styles.funFact}>{discovery.headlineFact}</Text>
            <View style={[styles.factRibbon, { borderColor: theme.secondary }]}>
              <Text style={styles.factRibbonText}>{discovery.explanation}</Text>
            </View>
            {saveFailed ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                We couldn’t save that yet. Swipe again to retry.
              </Text>
            ) : null}
            <View style={styles.swipeHints}>
              {canGoBack ? <Text style={styles.swipeHintText}>←</Text> : <View />}
              <Text style={styles.swipeHintText}>
                {position < total ? '→' : 'Swipe to finish →'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', alignItems: 'center', backgroundColor: '#8EAE83' },
  topBar: {
    position: 'absolute',
    zIndex: 8,
    left: 16,
    right: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E6EE',
  },
  closeText: {
    color: '#473329',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 28,
    lineHeight: 31,
  },
  progressText: {
    color: '#FFF9E8',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 16,
    textShadowColor: '#38513D',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  worldText: {
    position: 'absolute',
    right: 0,
    color: '#FFF9E8',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    textShadowColor: '#38513D',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardFrame: {
    position: 'absolute',
    borderRadius: 30,
    shadowColor: '#1E3025',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.29,
    shadowRadius: 18,
    elevation: 12,
  },
  face: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#D9AC62',
    overflow: 'hidden',
    backgroundColor: '#FFF8E5',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  artwork: { alignItems: 'center' },
  title: {
    marginTop: 12,
    color: '#483329',
    fontFamily: fontFamily.displayBold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  funFact: {
    marginTop: 12,
    color: '#5E4433',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 23,
    lineHeight: 31,
    textAlign: 'center',
  },
  factRibbon: {
    width: '100%',
    marginTop: 18,
    backgroundColor: '#F7E7C4',
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  factRibbonText: {
    color: '#6A513C',
    fontFamily: fontFamily.bodyRegular,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 14,
    color: '#8C2F24',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  swipeHints: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  swipeHintText: {
    color: '#8C7457',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
  },
});
