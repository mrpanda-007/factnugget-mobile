import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdventureBackdrop, DiscoveryHeroArt } from '@components/DiscoveryAdventureScene';
import { OllieCharacter } from '@features/onboarding/components/OllieCharacter';
import { animationDurations, fontFamily, worldThemes } from '@constants/tokens';
import type { Discovery } from '@app-types/Discovery';

interface DiscoveryCardProps {
  discovery: Discovery;
  position: number;
  total: number;
  onNext: () => void;
  onPrevious?: () => void;
}

const SWIPE_DISTANCE_THRESHOLD = 72;
const SWIPE_VELOCITY_THRESHOLD = 560;

/**
 * Screen 3's discovery deck. The reference storyboard informs the deck's
 * asymmetric staging and reveal choreography only; its wireframe visuals are
 * deliberately not reproduced here.
 */
export function DiscoveryCard({
  discovery,
  position,
  total,
  onNext,
  onPrevious,
}: DiscoveryCardProps) {
  const theme = worldThemes[discovery.category];
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [revealed, setRevealed] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const reveal = useSharedValue(0);
  const swipeX = useSharedValue(0);
  const bonus = useSharedValue(0);

  const cardWidth = Math.min(width * 0.72, 332);
  const cardHeight = Math.min(Math.max(height * 0.52, 390), 480);
  const cardRight = Math.max(-10, width * 0.008);
  const ollieSize = Math.min(width * 0.3, 118);

  useEffect(() => {
    reveal.value = withTiming(revealed ? 1 : 0, {
      duration: reducedMotion ? animationDurations.fast : 560,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [reducedMotion, reveal, revealed]);

  useEffect(() => {
    if (!showBonus) return;
    const timer = setTimeout(() => setShowBonus(false), reducedMotion ? 220 : 1000);
    return () => clearTimeout(timer);
  }, [reducedMotion, showBonus]);

  const finishTransition = (direction: 'next' | 'previous') => {
    if (direction === 'previous' && onPrevious) onPrevious();
    else if (direction === 'next') onNext();
  };

  const beginTransition = (direction: 'next' | 'previous') => {
    if (isTransitioning || (direction === 'previous' && !onPrevious)) return;
    setIsTransitioning(true);
    swipeX.value = withTiming(
      direction === 'next' ? -width * 1.2 : width * 1.2,
      { duration: reducedMotion ? 120 : 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishTransition)(direction);
      },
    );
  };

  const toggleReveal = () => {
    if (!isTransitioning) setRevealed((current) => !current);
  };

  const triggerBonus = () => {
    if (isTransitioning) return;
    setShowBonus(true);
    bonus.value = withSequence(
      withTiming(1, { duration: reducedMotion ? 100 : 180 }),
      withTiming(0, { duration: reducedMotion ? 180 : 700, easing: Easing.out(Easing.quad) }),
    );
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      if (event.translationX > 0 && !onPrevious) {
        swipeX.value = event.translationX * 0.13;
      } else {
        swipeX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const goesNext =
        event.translationX < -SWIPE_DISTANCE_THRESHOLD ||
        event.velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const goesPrevious =
        onPrevious &&
        (event.translationX > SWIPE_DISTANCE_THRESHOLD ||
          event.velocityX > SWIPE_VELOCITY_THRESHOLD);

      if (goesNext) runOnJS(beginTransition)('next');
      else if (goesPrevious) runOnJS(beginTransition)('previous');
      else
        swipeX.value = withTiming(0, {
          duration: reducedMotion ? 100 : 240,
          easing: Easing.out(Easing.cubic),
        });
    });

  const gesture = Gesture.Exclusive(
    pan,
    Gesture.LongPress()
      .minDuration(520)
      .onStart(() => runOnJS(triggerBonus)()),
    Gesture.Tap().onEnd(() => runOnJS(toggleReveal)()),
  );

  const cardFlightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: swipeX.value + interpolate(reveal.value, [0, 1], [0, -width * 0.14]) },
      { translateY: interpolate(reveal.value, [0, 1], [0, -8]) },
      { scale: interpolate(reveal.value, [0, 1], [1, 1.045]) },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.43, 0.5], [1, 1, 0]),
    transform: [
      { perspective: 1100 },
      { rotateY: `${interpolate(reveal.value, [0, 0.5], [0, 90])}deg` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0.46, 0.56, 1], [0, 1, 1]),
    transform: [
      { perspective: 1100 },
      { rotateY: `${interpolate(reveal.value, [0.48, 1], [-90, 0])}deg` },
    ],
  }));
  const bonusStyle = useAnimatedStyle(() => ({
    opacity: bonus.value,
    transform: [
      { translateY: interpolate(bonus.value, [0, 1], [8, -10]) },
      { scale: 0.9 + bonus.value * 0.1 },
    ],
  }));

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <AdventureBackdrop worldId={discovery.category} />
      </View>

      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(350)}
        style={[styles.topLine, { top: insets.top + 16 }]}
      >
        <Text style={styles.progressText}>
          Discovery {position} of {total}
        </Text>
        <Text style={styles.worldText}>{theme.label}</Text>
      </Animated.View>

      <Animated.View
        style={[styles.ollieSpot, { top: height * 0.61, left: 4, width: ollieSize + 32 }]}
        pointerEvents="none"
      >
        <OllieCharacter size={ollieSize} />
        <Text style={styles.ollieCaption}>
          {showBonus ? 'What a wonder!' : revealed ? 'I knew you’d find it!' : 'Tap the deck!'}
        </Text>
      </Animated.View>

      {showBonus ? (
        <Animated.View style={[styles.bonus, bonusStyle]} pointerEvents="none">
          <Text style={styles.bonusText}>✦ Ollie’s discovery dance! ✦</Text>
        </Animated.View>
      ) : null}

      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${discovery.title}. ${revealed ? discovery.funFact : 'Tap to reveal this discovery.'}`}
          accessibilityHint="Tap to turn the card. Swipe left for the next discovery, or swipe right for the previous one."
          style={[
            styles.cardFrame,
            {
              width: cardWidth,
              height: cardHeight,
              right: cardRight,
              top: insets.top + 70,
            },
            cardFlightStyle,
          ]}
        >
          <Animated.View style={[styles.cardFace, styles.cardFront, frontStyle]}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: theme.tint, borderColor: theme.secondary },
              ]}
            >
              <Text style={[styles.categoryText, { color: theme.primary }]}>{theme.label}</Text>
            </View>
            <View style={styles.heroArt}>
              <DiscoveryHeroArt worldId={discovery.category} size={cardWidth * 0.7} />
            </View>
            <Text style={styles.frontTitle} numberOfLines={2}>
              {discovery.title}
            </Text>
            <Text style={styles.frontSubtitle} numberOfLines={2}>
              {discovery.subtitle}
            </Text>
            <View style={styles.turnHint}>
              <Text style={styles.turnHintText}>Tap to uncover the wonder</Text>
              <Text style={styles.turnArrow}>↗</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.cardFace, styles.cardBack, backStyle]}>
            <View style={styles.backHeader}>
              <View style={[styles.foundSeal, { backgroundColor: theme.primary }]}>
                <Text style={styles.foundSealText}>FOUND</Text>
              </View>
              <Text style={styles.backEyebrow}>{theme.label}</Text>
            </View>
            <Text style={styles.backTitle}>{discovery.title}</Text>
            <Text style={styles.funFact} numberOfLines={4}>
              {discovery.funFact}
            </Text>
            <View style={[styles.factRibbon, { borderColor: theme.secondary }]}>
              <Text style={styles.factRibbonText} numberOfLines={3}>
                {discovery.easyDescription}
              </Text>
            </View>
            <View style={styles.rewardLine}>
              <Text style={styles.rewardIcon}>{discovery.stickerReward.icon}</Text>
              <Text style={styles.rewardText}>{discovery.stickerReward.label}</Text>
            </View>
            <Text style={styles.backHint}>Swipe for another discovery</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <View style={[styles.bottomControls, { bottom: Math.max(insets.bottom, 12) + 16 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous discovery"
          accessibilityState={{ disabled: !onPrevious }}
          disabled={!onPrevious || isTransitioning}
          onPress={() => beginTransition('previous')}
          style={[styles.navControl, !onPrevious && styles.navControlMuted]}
        >
          <Text style={styles.navArrow}>←</Text>
        </Pressable>
        <Text style={styles.swipeHint}>Swipe the deck</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={position === total ? 'Finish adventure' : 'Next discovery'}
          disabled={isTransitioning}
          onPress={() => beginTransition('next')}
          style={styles.navControl}
        >
          <Text style={styles.navArrow}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: '#8EAE83' },
  topLine: {
    position: 'absolute',
    zIndex: 6,
    left: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFF9E8',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 14,
    textShadowColor: '#38513D',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  worldText: {
    marginLeft: 'auto',
    color: '#FFF9E8',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    textShadowColor: '#38513D',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ollieSpot: { position: 'absolute', zIndex: 5, alignItems: 'center' },
  ollieCaption: {
    marginTop: -3,
    color: '#FFF8E6',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 12,
    textAlign: 'center',
    textShadowColor: '#2F4A39',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bonus: {
    position: 'absolute',
    zIndex: 8,
    left: 24,
    top: '48%',
    backgroundColor: '#FFF3C8',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D6A954',
  },
  bonusText: { color: '#68462F', fontFamily: fontFamily.displaySemiBold, fontSize: 12 },
  cardFrame: {
    position: 'absolute',
    zIndex: 4,
    shadowColor: '#1E3025',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.29,
    shadowRadius: 18,
    elevation: 12,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: '#FFF8E5',
    borderColor: '#D9AC62',
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 18,
  },
  cardBack: { backgroundColor: '#FFF8E5', borderColor: '#D9AC62', padding: 23 },
  categoryBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  categoryText: { fontFamily: fontFamily.bodyExtraBold, fontSize: 11, letterSpacing: 0.5 },
  heroArt: {
    flex: 1,
    minHeight: 130,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frontTitle: {
    color: '#473329',
    fontFamily: fontFamily.displayBold,
    fontSize: 27,
    lineHeight: 31,
    textAlign: 'center',
  },
  frontSubtitle: {
    marginTop: 6,
    color: '#725A45',
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
  },
  turnHint: { flexDirection: 'row', alignItems: 'center', marginTop: 13, marginBottom: 14 },
  turnHintText: { color: '#A06D3F', fontFamily: fontFamily.bodySemiBold, fontSize: 12 },
  turnArrow: { marginLeft: 7, color: '#A06D3F', fontFamily: fontFamily.displayBold, fontSize: 18 },
  backHeader: { flexDirection: 'row', alignItems: 'center' },
  foundSeal: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    transform: [{ rotate: '4deg' }],
  },
  foundSealText: {
    color: '#FFF8E8',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  backEyebrow: {
    marginLeft: 'auto',
    color: '#7B6047',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
  },
  backTitle: {
    marginTop: 24,
    color: '#483329',
    fontFamily: fontFamily.displayBold,
    fontSize: 27,
    lineHeight: 31,
  },
  funFact: {
    marginTop: 12,
    color: '#5E4433',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 19,
    lineHeight: 26,
  },
  factRibbon: {
    marginTop: 'auto',
    backgroundColor: '#F7E7C4',
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  factRibbonText: {
    color: '#6A513C',
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  rewardLine: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  rewardIcon: { fontSize: 21 },
  rewardText: {
    marginLeft: 7,
    color: '#805936',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    flex: 1,
  },
  backHint: {
    marginTop: 12,
    color: '#A27445',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    textAlign: 'center',
  },
  bottomControls: {
    position: 'absolute',
    zIndex: 7,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8E6',
    borderWidth: 1.5,
    borderColor: '#D9B169',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F4939',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  navControlMuted: { opacity: 0.38 },
  navArrow: { color: '#624630', fontFamily: fontFamily.displayBold, fontSize: 23 },
  swipeHint: {
    marginHorizontal: 18,
    color: '#FFF9E8',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 13,
    textShadowColor: '#2F4A39',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
