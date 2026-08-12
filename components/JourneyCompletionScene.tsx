import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OllieCharacter } from '@features/onboarding/components/OllieCharacter';
import { StorybookButton } from '@features/onboarding/components/StorybookButton';
import { fontFamily, worldThemes, type WorldId } from '@constants/tokens';
import type { WorldSummary } from '@features/explore/hooks/useWorldSummaries';
import type { Deck } from '@app-types/Deck';

interface JourneyCompletionSceneProps {
  deck: Deck;
  completedWorldIds: WorldId[];
  nextWorlds: WorldSummary[];
  onExploreWorld: (worldId: WorldId) => void;
  onReturnToMap: () => void;
}

function clamp(value: number, start: number, end: number) {
  'worklet';
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

/**
 * A single cinematic collection scene. The journey is already persisted by
 * DiscoveryCardScreen before this route mounts; this component is presentation
 * only and never attempts to award anything itself.
 */
export function JourneyCompletionScene({
  deck,
  completedWorldIds,
  nextWorlds,
  onExploreWorld,
  onReturnToMap,
}: JourneyCompletionSceneProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const sequence = useSharedValue(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const shelfWidth = Math.min(width * 0.76, 320);
  const shelfLeft = (width - shelfWidth) / 2;
  const shelfTop = Math.max(insets.top + 160, height * 0.25);
  const artifactSize = Math.min(width * 0.39, 156);
  const caseWidth = Math.min(width * 0.6, 238);
  const caseLeft = width * 0.56 - caseWidth / 2;
  const caseTop = height * 0.48;
  const artifactLeft = width * 0.56 - artifactSize / 2;
  const artifactTop = caseTop + 8;
  const shelfArtifactLeft = shelfLeft + shelfWidth * 0.78 - artifactSize * 0.18;
  const shelfArtifactTop = shelfTop + 33 - artifactSize * 0.18;

  useEffect(() => {
    sequence.value = 0;
    sequence.value = withTiming(
      1,
      {
        duration: reducedMotion ? 1150 : 8200,
        easing: Easing.inOut(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(setControlsVisible)(true);
      },
    );
    return () => {
      sequence.value = 0;
    };
  }, [reducedMotion, sequence]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.05, 0.16),
    transform: [{ translateY: interpolate(clamp(sequence.value, 0.05, 0.16), [0, 1], [12, 0]) }],
  }));
  const presentationCopyStyle = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.6, 0.72) * (1 - clamp(sequence.value, 0.78, 0.88)),
    transform: [{ translateY: interpolate(clamp(sequence.value, 0.6, 0.72), [0, 1], [8, 0]) }],
  }));
  const addedCopyStyle = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.84, 0.95),
  }));
  const environmentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(sequence.value, [0.42, 0.72], [1, 1.018]) }],
    opacity: interpolate(sequence.value, [0.42, 0.55, 0.73], [1, 0.9, 1]),
  }));
  const caseStyle = useAnimatedStyle(() => {
    const enter = clamp(sequence.value, 0.14, 0.3);
    return {
      opacity: enter,
      transform: [
        { translateY: interpolate(enter, [0, 1], [55, 0]) },
        { scale: interpolate(enter, [0, 1], [0.9, 1]) },
        { rotateZ: `${interpolate(enter, [0, 1], [-2, 0])}deg` },
      ],
    };
  });
  const ollieStyle = useAnimatedStyle(() => {
    const celebrate = clamp(sequence.value, 0.68, 0.8);
    return {
      opacity: clamp(sequence.value, 0.2, 0.34),
      transform: [
        { translateY: interpolate(celebrate, [0, 0.5, 1], [0, -7, 0]) },
        { rotateZ: `${interpolate(celebrate, [0, 0.5, 1], [0, -4, 0])}deg` },
      ],
    };
  });
  const artifactStyle = useAnimatedStyle(() => {
    const emerge = clamp(sequence.value, 0.43, 0.64);
    const collect = clamp(sequence.value, 0.76, 0.91);
    const heroY = -height * 0.215;
    return {
      opacity: clamp(sequence.value, 0.4, 0.49),
      transform: [
        { translateX: collect * (shelfArtifactLeft - artifactLeft) },
        {
          translateY:
            interpolate(emerge, [0, 1], [28, heroY]) +
            collect * (shelfArtifactTop - artifactTop - heroY),
        },
        {
          scale:
            interpolate(emerge, [0, 1], [0.62, 1.04]) * interpolate(collect, [0, 1], [1, 0.35]),
        },
        {
          rotateY: `${interpolate(sequence.value, [0.43, 0.59, 0.68, 0.76, 0.91], [-24, -7, 8, 0, 0])}deg`,
        },
        { rotateX: `${interpolate(sequence.value, [0.43, 0.63, 0.72, 0.91], [7, -3, 2, 0])}deg` },
      ],
    };
  });
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.9, 1),
    transform: [{ translateY: interpolate(clamp(sequence.value, 0.9, 1), [0, 1], [12, 0]) }],
  }));

  const existingArtifacts = useMemo(
    () => completedWorldIds.filter((worldId) => worldId !== deck.category).slice(0, 3),
    [completedWorldIds, deck.category],
  );

  return (
    <View style={styles.screen}>
      <Animated.View style={[StyleSheet.absoluteFill, environmentStyle]} pointerEvents="none">
        <CompletionEnvironment worldId={deck.category} />
      </Animated.View>

      <Animated.View style={[styles.header, { top: insets.top + 16 }, titleStyle]}>
        <Text style={styles.heading}>
          Wow! You completed{`\n`}
          {deck.title}!
        </Text>
        <Text style={styles.supporting}>
          You discovered {deck.discoveryIds.length} amazing{' '}
          {deck.discoveryIds.length === 1 ? 'thing' : 'things'}.
        </Text>
      </Animated.View>

      <ExplorerCollectionShelf
        width={shelfWidth}
        left={shelfLeft}
        top={shelfTop}
        currentWorldId={deck.category}
        existingWorldIds={existingArtifacts}
        sequence={sequence}
      />

      <Animated.View
        style={[styles.casePosition, { left: caseLeft, top: caseTop, width: caseWidth }, caseStyle]}
        pointerEvents="none"
      >
        <DiscoveryCase width={caseWidth} worldId={deck.category} sequence={sequence} />
      </Animated.View>

      <CompletionParticles sequence={sequence} />

      <Animated.View
        style={[
          styles.artifactPosition,
          { left: artifactLeft, top: artifactTop, width: artifactSize, height: artifactSize },
          artifactStyle,
        ]}
        pointerEvents="none"
      >
        <JourneyCollectible
          worldId={deck.category}
          size={artifactSize}
          icon={deck.rewardBadge.icon}
        />
      </Animated.View>

      <Animated.View style={[styles.collectibleCopy, presentationCopyStyle]} pointerEvents="none">
        <Text style={styles.collectibleEyebrow}>World badge earned</Text>
        <Text style={styles.collectibleName}>{deck.rewardBadge.label}</Text>
        <Text style={styles.collectibleDescription}>
          You added every discovery in this World to My Discoveries.
        </Text>
      </Animated.View>
      <Animated.View style={[styles.addedCopy, addedCopyStyle]} pointerEvents="none">
        <Text style={styles.addedText}>Badge earned!</Text>
      </Animated.View>

      <Animated.View
        style={[styles.ollie, { left: 10, top: height * 0.57 }, ollieStyle]}
        pointerEvents="none"
      >
        <OllieCharacter size={Math.min(width * 0.27, 104)} />
        <Text style={styles.ollieNote}>You discovered the whole World!</Text>
      </Animated.View>

      <Animated.View
        pointerEvents={controlsVisible ? 'auto' : 'none'}
        style={[styles.nextArea, { bottom: Math.max(insets.bottom, 10) + 8 }, controlsStyle]}
      >
        {nextWorlds.length > 0 ? (
          <>
            <Text style={styles.nextPrompt}>Where should we explore next?</Text>
            <View style={styles.portalRow}>
              {nextWorlds.slice(0, 3).map((world) => (
                <WorldPortal
                  key={world.category.id}
                  worldId={world.category.id}
                  title={world.category.title}
                  onPress={() => onExploreWorld(world.category.id)}
                />
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.nextPrompt}>More discoveries are waiting in Explore.</Text>
        )}
        <StorybookButton label="Back to Explore" onPress={onReturnToMap} />
      </Animated.View>
    </View>
  );
}

function CompletionEnvironment({ worldId }: { worldId: WorldId }) {
  const theme = worldThemes[worldId];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 760" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="museumWall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.id === 'space' ? '#4D466A' : '#7B8062'} />
          <Stop offset="0.52" stopColor={theme.id === 'ocean' ? '#6B9E9D' : '#A68A63'} />
          <Stop offset="1" stopColor="#5B4535" />
        </LinearGradient>
        <LinearGradient id="museumWood" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9C663A" />
          <Stop offset="1" stopColor="#4E3025" />
        </LinearGradient>
        <LinearGradient id="museumGlow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF0A5" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFF0A5" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={390} height={760} fill="url(#museumWall)" />
      <Rect x={0} y={0} width={390} height={470} fill="url(#museumGlow)" opacity={0.56} />
      <Path d="M0 558 C97 532 184 561 271 540 C316 529 359 534 390 525 V760 H0 Z" fill="#694733" />
      <Path
        d="M0 607 C99 583 186 609 278 584 C324 572 360 578 390 570"
        fill="none"
        stroke="#B47C48"
        strokeWidth={2}
        opacity={0.48}
      />
      <Path d="M18 89 C36 69 57 71 72 93 V554 C56 538 37 539 18 554 Z" fill="url(#museumWood)" />
      <Path
        d="M318 92 C340 69 365 72 382 96 V555 C363 538 339 540 318 556 Z"
        fill="url(#museumWood)"
      />
      <Path
        d="M18 204 H74 M317 209 H381 M18 356 H65 M330 361 H381"
        stroke="#D2A060"
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.8}
      />
      <G opacity={0.68}>
        <Rect x={27} y={120} width={12} height={65} rx={4} fill="#C77A58" />
        <Rect x={41} y={130} width={11} height={55} rx={4} fill="#6B9373" />
        <Rect x={54} y={112} width={13} height={73} rx={4} fill="#E1B363" />
        <Rect x={328} y={120} width={13} height={66} rx={4} fill="#668C96" />
        <Rect x={343} y={112} width={14} height={74} rx={4} fill="#C57C64" />
        <Rect x={359} y={129} width={12} height={57} rx={4} fill="#8B79A8" />
      </G>
      <Path
        d="M0 720 C8 649 30 606 71 590 C50 653 48 710 58 760 H0 Z M390 760 H336 C345 705 337 648 314 597 C360 620 382 674 390 760 Z"
        fill="#2E4E38"
        opacity={0.9}
      />
      <G fill="#FFF1B4" opacity={0.6}>
        <Circle cx={112} cy={108} r={2} />
        <Circle cx={128} cy={124} r={1.5} />
        <Circle cx={277} cy={99} r={1.8} />
        <Circle cx={291} cy={124} r={1.4} />
      </G>
    </Svg>
  );
}

function DiscoveryCase({
  width,
  worldId,
  sequence,
}: {
  width: number;
  worldId: WorldId;
  sequence: SharedValue<number>;
}) {
  const lidStyle = useAnimatedStyle(() => {
    const open = clamp(sequence.value, 0.34, 0.48);
    return {
      transform: [
        { perspective: 900 },
        { translateY: interpolate(open, [0, 1], [0, -8]) },
        { rotateX: `${interpolate(open, [0, 1], [0, -73])}deg` },
      ],
      opacity: 1 - clamp(sequence.value, 0.84, 0.97) * 0.45,
    };
  });
  const glowStyle = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.31, 0.47) * (1 - clamp(sequence.value, 0.8, 0.97) * 0.5),
    transform: [{ scale: interpolate(clamp(sequence.value, 0.31, 0.48), [0, 1], [0.5, 1.16]) }],
  }));
  const accent = worldThemes[worldId].secondary;
  const height = width * 0.59;
  return (
    <View style={{ width, height }}>
      <Animated.View
        style={[
          styles.caseGlow,
          {
            backgroundColor: accent,
            width: width * 0.9,
            height: height * 0.58,
            left: width * 0.05,
            top: height * 0.05,
          },
          glowStyle,
        ]}
      />
      <Svg width={width} height={height} viewBox="0 0 240 142">
        <Defs>
          <LinearGradient id="caseWood" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B6763F" />
            <Stop offset="1" stopColor="#61391F" />
          </LinearGradient>
          <LinearGradient id="caseLining" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F3D991" />
            <Stop offset="1" stopColor="#A67747" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={120} cy={128} rx={105} ry={10} fill="#2D1E18" opacity={0.25} />
        <Path
          d="M24 71 C27 59 40 55 53 58 H187 C201 55 214 59 216 71 V115 C211 125 199 129 187 127 H53 C41 129 29 125 24 115 Z"
          fill="url(#caseWood)"
          stroke="#43281C"
          strokeWidth={3}
        />
        <Path
          d="M36 78 C39 68 49 67 59 69 H181 C192 67 201 69 204 78 V107 C200 115 192 117 181 115 H59 C48 117 40 115 36 107 Z"
          fill="url(#caseLining)"
          stroke="#704423"
          strokeWidth={2}
        />
        <Path d="M30 107 H210" stroke="#E5B96B" strokeWidth={3} opacity={0.75} />
        <Rect
          x={108}
          y={104}
          width={24}
          height={18}
          rx={4}
          fill="#D7A750"
          stroke="#53351E"
          strokeWidth={2}
        />
      </Svg>
      <Animated.View style={[styles.caseLid, { width, height: height * 0.57 }, lidStyle]}>
        <Svg width={width} height={height * 0.57} viewBox="0 0 240 81">
          <Path
            d="M25 77 V30 C27 15 39 9 55 11 H185 C201 9 213 15 215 30 V77 C204 70 194 68 183 70 H57 C46 68 36 70 25 77 Z"
            fill="#995F34"
            stroke="#43281C"
            strokeWidth={3}
          />
          <Path
            d="M37 65 V33 C39 24 48 21 59 22 H181 C192 21 201 24 203 33 V65 C195 61 189 60 179 61 H61 C51 60 45 61 37 65 Z"
            fill="#E9C978"
            stroke="#6D4324"
            strokeWidth={2}
          />
          <Path d="M53 43 H187" stroke="#C08A49" strokeWidth={2} opacity={0.55} />
          <Circle cx={120} cy={37} r={6} fill="#D7A750" stroke="#5B3820" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function JourneyCollectible({
  worldId,
  size,
  icon,
}: {
  worldId: WorldId;
  size: number;
  icon?: string;
}) {
  const theme = worldThemes[worldId];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(2, size * 0.035),
        borderColor: '#FFE7A0',
        backgroundColor: theme.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2E241B',
        shadowOffset: { width: 0, height: Math.max(2, size * 0.04) },
        shadowOpacity: 0.3,
        shadowRadius: Math.max(3, size * 0.06),
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: size * 0.39,
          borderWidth: Math.max(1, size * 0.018),
          borderColor: theme.secondary,
          backgroundColor: theme.tint,
          opacity: 0.95,
        }}
      />
      <Text style={{ fontSize: size * 0.42 }}>{icon ?? theme.emoji}</Text>
    </View>
  );
}

function ExplorerCollectionShelf({
  width,
  left,
  top,
  currentWorldId,
  existingWorldIds,
  sequence,
}: {
  width: number;
  left: number;
  top: number;
  currentWorldId: WorldId;
  existingWorldIds: WorldId[];
  sequence: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.08, 0.2),
    transform: [{ translateY: interpolate(clamp(sequence.value, 0.08, 0.2), [0, 1], [-10, 0]) }],
  }));
  const newSlotStyle = useAnimatedStyle(() => ({
    opacity: clamp(sequence.value, 0.8, 0.93),
    backgroundColor: worldThemes[currentWorldId].secondary,
  }));
  return (
    <Animated.View style={[styles.shelf, { width, left, top }, style]} pointerEvents="none">
      <Text style={styles.shelfTitle}>World Badges</Text>
      <View style={styles.shelfItems}>
        {existingWorldIds.map((worldId) => (
          <View key={worldId} style={styles.oldArtifact}>
            <JourneyCollectible worldId={worldId} size={31} />
          </View>
        ))}
        <Animated.View style={[styles.newArtifactSlot, newSlotStyle]}>
          <Text style={styles.newSlotLabel}>new</Text>
        </Animated.View>
      </View>
      <View style={styles.shelfLip} />
    </Animated.View>
  );
}

function CompletionParticles({ sequence }: { sequence: SharedValue<number> }) {
  const particles = [
    { x: -70, y: -74, delay: 0 },
    { x: -35, y: -108, delay: 0.02 },
    { x: 8, y: -90, delay: 0.04 },
    { x: 52, y: -106, delay: 0.06 },
    { x: 78, y: -64, delay: 0.09 },
    { x: -88, y: -38, delay: 0.12 },
  ];
  return (
    <View pointerEvents="none" style={styles.particleStage}>
      {particles.map((particle, index) => (
        <CompletionParticle key={index} {...particle} sequence={sequence} />
      ))}
    </View>
  );
}

function CompletionParticle({
  x,
  y,
  delay,
  sequence,
}: {
  x: number;
  y: number;
  delay: number;
  sequence: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const rise = clamp(sequence.value, 0.4 + delay, 0.6 + delay);
    return {
      opacity: rise * (1 - clamp(sequence.value, 0.72, 0.84)),
      transform: [
        { translateX: x * rise },
        { translateY: 180 + y * rise },
        { scale: 0.5 + rise * 0.8 },
      ],
    };
  });
  return <Animated.View style={[styles.particle, style]} />;
}

function WorldPortal({
  worldId,
  title,
  onPress,
}: {
  worldId: WorldId;
  title: string;
  onPress: () => void;
}) {
  const theme = worldThemes[worldId];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Explore ${title} next`}
      onPress={onPress}
      style={styles.portal}
    >
      <View
        style={[
          styles.portalWorld,
          { backgroundColor: theme.background, borderColor: theme.primary },
        ]}
      >
        <PortalIllustration worldId={worldId} />
      </View>
      <Text style={styles.portalLabel} numberOfLines={1}>
        {title.replace(/ world$/i, '')}
      </Text>
    </Pressable>
  );
}

function PortalIllustration({ worldId }: { worldId: WorldId }) {
  const theme = worldThemes[worldId];
  return (
    <Svg width={47} height={47} viewBox="0 0 60 60">
      <Path
        d="M7 40 C8 23 21 15 34 18 C49 15 57 27 53 42 C47 53 22 56 9 47 Z"
        fill={theme.primary}
        opacity={0.85}
      />
      {worldId === 'space' ? (
        <>
          <Path d="M13 36 C27 22 44 25 52 33" fill="none" stroke="#F5D275" strokeWidth={3} />
          <Circle cx={37} cy={29} r={5} fill="#AB97CE" />
        </>
      ) : worldId === 'ocean' ? (
        <Path
          d="M13 38 C22 31 29 43 39 36 C45 32 49 35 52 36"
          fill="none"
          stroke="#E8FBF3"
          strokeWidth={3}
        />
      ) : (
        <Path
          d="M18 40 l8 -16 l8 16 M30 38 l8 -20 l9 20"
          fill="#5B8051"
          stroke="#41603C"
          strokeWidth={1.5}
        />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: '#7B8062' },
  header: { position: 'absolute', left: 28, right: 28, zIndex: 8, alignItems: 'center' },
  heading: {
    color: '#FFF7E1',
    fontFamily: fontFamily.displayBold,
    fontSize: 29,
    lineHeight: 34,
    textAlign: 'center',
    textShadowColor: '#3D2D23',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  supporting: {
    marginTop: 8,
    color: '#F7E8C5',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    textAlign: 'center',
  },
  shelf: {
    position: 'absolute',
    zIndex: 3,
    height: 112,
    borderRadius: 18,
    backgroundColor: '#623E2A',
    borderWidth: 2,
    borderColor: '#C28A4B',
    paddingTop: 12,
    paddingHorizontal: 15,
    shadowColor: '#2A1B17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 9,
    elevation: 6,
  },
  shelfTitle: {
    color: '#EFD39A',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  shelfItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  oldArtifact: {
    width: 37,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  newArtifactSlot: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.25,
  },
  newSlotLabel: { color: '#FFF7D3', fontFamily: fontFamily.bodyExtraBold, fontSize: 9 },
  shelfLip: {
    position: 'absolute',
    height: 11,
    left: -5,
    right: -5,
    bottom: -7,
    borderRadius: 7,
    backgroundColor: '#A76E3B',
    borderWidth: 1,
    borderColor: '#613B26',
  },
  casePosition: { position: 'absolute', zIndex: 4 },
  caseGlow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.38,
    transform: [{ scaleY: 0.52 }],
  },
  caseLid: { position: 'absolute', top: 0, left: 0, transformOrigin: '50% 100%' },
  particleStage: { position: 'absolute', zIndex: 6, left: '50%', top: '40%' },
  particle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFE79B',
    shadowColor: '#FFE59A',
    shadowRadius: 5,
    shadowOpacity: 0.85,
  },
  artifactPosition: {
    position: 'absolute',
    zIndex: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectibleCopy: {
    position: 'absolute',
    zIndex: 8,
    top: '47%',
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  collectibleEyebrow: {
    color: '#F8E9C2',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  collectibleName: {
    marginTop: 3,
    color: '#FFF9E9',
    fontFamily: fontFamily.displayBold,
    fontSize: 25,
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: '#382921',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  collectibleDescription: {
    marginTop: 7,
    color: '#F5E8C9',
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 285,
    textAlign: 'center',
  },
  addedCopy: {
    position: 'absolute',
    zIndex: 8,
    top: '43%',
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF0BC',
    borderWidth: 1,
    borderColor: '#D7A758',
  },
  addedText: { color: '#68442D', fontFamily: fontFamily.displaySemiBold, fontSize: 13 },
  ollie: { position: 'absolute', zIndex: 7, width: 124, alignItems: 'center' },
  ollieNote: {
    marginTop: -4,
    color: '#FFF5D9',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 11,
    textAlign: 'center',
    textShadowColor: '#382D24',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nextArea: { position: 'absolute', zIndex: 10, left: 16, right: 16, alignItems: 'center' },
  nextPrompt: {
    color: '#FFF7E0',
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 16,
    textAlign: 'center',
    textShadowColor: '#382D24',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  portalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginTop: 8,
    marginBottom: 12,
  },
  portal: { width: 65, alignItems: 'center' },
  portalWorld: {
    width: 53,
    height: 53,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#33271F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  portalLabel: {
    marginTop: 3,
    color: '#FFF6DD',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 70,
    textShadowColor: '#33271F',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
