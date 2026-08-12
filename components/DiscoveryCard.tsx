import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdventureBackdrop } from '@components/DiscoveryAdventureScene';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { animationDurations, fontFamily, worldThemes } from '@constants/tokens';
import type { Discovery } from '@app-types/Discovery';

interface DiscoveryCardProps {
  discovery: Discovery;
  position: number;
  total: number;
  collected: boolean;
  nextDiscoveryTitle?: string;
  onCollect: () => Promise<void>;
  onAcknowledged: () => void;
  onClose: () => void;
}

/**
 * One deliberate learning loop: subject → reveal → explicit collection.
 * Navigation is intentionally unavailable until the fact has been revealed,
 * and persistence is owned only by the primary collection action.
 */
export function DiscoveryCard({
  discovery,
  position,
  total,
  collected,
  nextDiscoveryTitle,
  onCollect,
  onAcknowledged,
  onClose,
}: DiscoveryCardProps) {
  const theme = worldThemes[discovery.category];
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [revealed, setRevealed] = useState(collected);
  const [isCollecting, setIsCollecting] = useState(false);
  const [added, setAdded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const revealProgress = useSharedValue(collected ? 1 : 0);

  const cardWidth = Math.min(width - 36, 430);
  const cardHeight = Math.min(Math.max(height - insets.top - insets.bottom - 136, 470), 620);
  const artworkSize = Math.min(cardWidth * 0.58, 220);

  useEffect(() => {
    revealProgress.value = withTiming(revealed ? 1 : 0, {
      duration: reducedMotion ? animationDurations.fast : 460,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [reducedMotion, revealProgress, revealed]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: 1 - revealProgress.value,
    transform: [{ scale: 1 - revealProgress.value * 0.03 }],
  }));
  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [{ translateY: (1 - revealProgress.value) * 12 }],
  }));

  const revealOnce = () => {
    if (!revealed && !isCollecting) setRevealed(true);
  };

  const collect = async () => {
    if (isCollecting) return;
    if (collected) {
      onAcknowledged();
      return;
    }

    setIsCollecting(true);
    setSaveFailed(false);
    try {
      await onCollect();
      setAdded(true);
      setTimeout(onAcknowledged, reducedMotion ? 160 : 560);
    } catch {
      setSaveFailed(true);
      setIsCollecting(false);
    }
  };

  const actionLabel = collected
    ? nextDiscoveryTitle
      ? `CONTINUE WITH ${nextDiscoveryTitle.toLocaleUpperCase()} →`
      : `BACK TO ${theme.label.toLocaleUpperCase()} →`
    : `ADD ${discovery.title.toLocaleUpperCase()} TO MY DISCOVERIES →`;
  const lowerTitle = discovery.title.toLocaleLowerCase();
  const subjectPhrase = lowerTitle.startsWith('the ')
    ? lowerTitle
    : `${/^[aeiou]/.test(lowerTitle) ? 'an' : 'a'} ${lowerTitle}`;

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <AdventureBackdrop worldId={discovery.category} />
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

      <View
        style={[
          styles.cardFrame,
          {
            width: cardWidth,
            height: cardHeight,
            top: insets.top + 72,
          },
        ]}
      >
        {!revealed ? (
          <Animated.View style={[styles.face, styles.front, frontStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${discovery.title}. Tap to discover what makes ${discovery.title} amazing.`}
              onPress={revealOnce}
              style={styles.primaryCardTap}
            >
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${discovery.title} artwork`}
              >
                <DiscoveryIllustration discovery={discovery} size={artworkSize} />
              </View>
              <Text style={styles.frontTitle}>{discovery.title}</Text>
              <Text style={styles.frontPrompt}>
                Tap to discover what makes{`\n`}
                {subjectPhrase} amazing.
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.face, styles.back, revealStyle]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.revealContent}
            >
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${discovery.title} artwork`}
                style={styles.revealArtwork}
              >
                <DiscoveryIllustration discovery={discovery} size={Math.min(artworkSize, 170)} />
              </View>
              <Text style={styles.backTitle}>{discovery.title}</Text>
              <Text style={styles.funFact}>{discovery.funFact}</Text>
              <View style={[styles.factRibbon, { borderColor: theme.secondary }]}>
                <Text style={styles.factRibbonText}>{discovery.easyDescription}</Text>
              </View>
              {saveFailed ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  We couldn’t save that yet. Please try again.
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionLabel.replace(' →', '')}
                accessibilityState={{ busy: isCollecting }}
                disabled={isCollecting}
                onPress={collect}
                style={({ pressed }) => [
                  styles.collectButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.pressed,
                  isCollecting && styles.disabled,
                ]}
              >
                <Text style={styles.collectButtonText}>
                  {isCollecting && !added ? 'ADDING…' : actionLabel}
                </Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}
      </View>

      {added ? (
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(80) : FadeIn.duration(180)}
          exiting={FadeOut.duration(100)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.acknowledgement}
        >
          <DiscoveryIllustration discovery={discovery} size={76} />
          <Text style={styles.addedTitle}>{discovery.title.toLocaleUpperCase()} ADDED!</Text>
          <Text style={styles.addedSubtitle}>It’s now in My Discoveries.</Text>
        </Animated.View>
      ) : null}
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
  },
  front: { alignItems: 'stretch' },
  primaryCardTap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  frontTitle: {
    marginTop: 22,
    color: '#473329',
    fontFamily: fontFamily.displayBold,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  frontPrompt: {
    marginTop: 14,
    color: '#725A45',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  back: { padding: 0 },
  revealContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  revealArtwork: { alignItems: 'center' },
  backTitle: {
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
  collectButton: {
    width: '100%',
    minHeight: 58,
    marginTop: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectButtonText: {
    color: '#FFF9E8',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 15,
    lineHeight: 21,
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
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.7 },
  acknowledgement: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 30,
    backgroundColor: '#FFF8E5F5',
  },
  addedTitle: {
    color: '#473329',
    fontFamily: fontFamily.displayBold,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  addedSubtitle: {
    color: '#725A45',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
});
