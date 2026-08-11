import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { OllieCharacter } from '@features/onboarding/components/OllieCharacter';
import { useWorldSummaries, type WorldSummary } from '@features/explore/hooks/useWorldSummaries';
import { colors, fontFamily, type WorldId } from '@constants/tokens';
import { explorerIdentityOptions } from '@constants/explorerIdentities';
import type { ExploreScreenProps } from '@navigation/types';
import { useExplorerStore } from '@store/useExplorerStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ScenePosition = { x: number; y: number; scale: number; size: number; emergeAt: number };

const scenePositions: Record<WorldId, ScenePosition> = {
  space: { x: 0.72, y: 0.25, scale: 0.76, size: 100, emergeAt: 0.47 },
  ocean: { x: 0.73, y: 0.43, scale: 1, size: 122, emergeAt: 0.57 },
  dinosaur: { x: 0.26, y: 0.57, scale: 1.04, size: 126, emergeAt: 0.52 },
  animal: { x: 0.79, y: 0.7, scale: 0.72, size: 112, emergeAt: 0.63 },
  earth: { x: 0.27, y: 0.73, scale: 0.76, size: 116, emergeAt: 0.68 },
};

/** Keeps the shipped two-pack catalogue balanced while future Sanity content
 * naturally expands into the full five-world arrangement. */
const compactScenePositions: Partial<Record<WorldId, ScenePosition>> = {
  space: { x: 0.3, y: 0.2, scale: 0.72, size: 92, emergeAt: 0.5 },
  ocean: { x: 0.72, y: 0.36, scale: 0.88, size: 116, emergeAt: 0.58 },
};

const sceneOrder: WorldId[] = ['dinosaur', 'ocean', 'space', 'animal', 'earth'];

function between(value: number, start: number, end: number) {
  'worklet';
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

function useIdleMotion(duration: number, amount: number, enabled: boolean) {
  const motion = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      motion.value = 0;
      return;
    }
    motion.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      motion.value = 0;
    };
  }, [duration, enabled, motion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: motion.value * amount }] }));
  return style;
}

/** Polished scenery rather than a literal transcription of the concept diagram. */
function RoomBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 390 760" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="libraryWall" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B9C9BF" />
            <Stop offset="0.58" stopColor="#D8D2BB" />
            <Stop offset="1" stopColor="#E7D7B9" />
          </LinearGradient>
          <LinearGradient id="walnut" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#9E693D" />
            <Stop offset="1" stopColor="#623E2B" />
          </LinearGradient>
          <LinearGradient id="floorboards" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C99762" />
            <Stop offset="1" stopColor="#94613F" />
          </LinearGradient>
          <RadialGradient id="windowLight" cx="50%" cy="10%" rx="62%" ry="64%">
            <Stop offset="0" stopColor="#FFF8DD" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#FFF8DD" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={390} height={760} fill="url(#libraryWall)" />
        <Rect width={390} height={760} fill="url(#windowLight)" />
        <Path
          d="M0 590 C80 570 139 585 202 573 C276 558 331 571 390 550 V760 H0 Z"
          fill="url(#floorboards)"
        />
        <Path
          d="M0 632 C105 613 179 632 260 612 C311 600 357 604 390 596"
          fill="none"
          stroke="#815038"
          strokeWidth={2}
          opacity={0.3}
        />
        <Path
          d="M0 693 C80 675 148 692 233 673 C299 659 347 669 390 655"
          fill="none"
          stroke="#815038"
          strokeWidth={2}
          opacity={0.25}
        />

        {/* A glowing arched window gives the room atmospheric depth. */}
        <Path d="M137 60 C137 11 253 11 253 60 V221 H137 Z" fill="#6B99A2" opacity={0.7} />
        <Path d="M145 62 C145 23 245 23 245 62 V211 H145 Z" fill="#D6E6E1" />
        <Path d="M145 126 H245 M195 24 V211" stroke="#A2B8AB" strokeWidth={4} opacity={0.78} />
        <Path
          d="M154 79 C166 66 182 73 187 82 C197 63 216 65 226 79 C236 74 242 82 246 90 V130 H145 V91 C150 84 151 81 154 79 Z"
          fill="#F8F3E3"
          opacity={0.85}
        />

        {/* Hand-painted bookcases frame, rather than diagram, the scene. */}
        <Path d="M0 70 C15 61 35 64 50 76 V578 C32 563 16 564 0 574 Z" fill="url(#walnut)" />
        <Path
          d="M340 74 C357 63 375 67 390 81 V577 C374 563 357 564 340 578 Z"
          fill="url(#walnut)"
        />
        <Path
          d="M6 175 C20 170 34 171 48 177 M4 312 C19 307 34 309 49 316 M3 454 C17 448 33 450 49 457"
          stroke="#E6B96F"
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.86}
        />
        <Path
          d="M341 176 C356 169 373 172 388 181 M341 308 C356 301 373 304 389 313 M341 458 C356 451 373 454 389 463"
          stroke="#E6B96F"
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.86}
        />
        <G>
          <Rect x={18} y={93} width={12} height={70} rx={5} fill="#D67B58" />
          <Rect x={32} y={104} width={10} height={59} rx={5} fill="#6A9277" />
          <Rect x={44} y={87} width={14} height={76} rx={5} fill="#E6B963" />
          <Rect x={330} y={105} width={12} height={61} rx={5} fill="#729DAD" />
          <Rect x={344} y={92} width={14} height={74} rx={5} fill="#C87D61" />
          <Rect x={360} y={112} width={11} height={54} rx={5} fill="#8776A5" />
        </G>
        <Path
          d="M34 512 C15 489 15 459 33 443 C50 465 48 489 38 515 M51 520 C46 485 62 460 79 456 C84 482 70 508 57 523"
          fill="#6E9A70"
          opacity={0.9}
        />
        <Path
          d="M302 470 l20 -50 l12 53 M310 448 l31 -4"
          fill="none"
          stroke="#664631"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.6}
        />
        <Circle cx={324} cy={416} r={6} fill="#D7A455" opacity={0.8} />
        <G fill="#FFF7D9" opacity={0.65}>
          <Circle cx={111} cy={108} r={2} />
          <Circle cx={121} cy={118} r={1.5} />
          <Circle cx={274} cy={94} r={2} />
          <Circle cx={286} cy={117} r={1.3} />
        </G>
      </Svg>
    </View>
  );
}

function WonderBook({ intro }: { intro: SharedValue<number> }) {
  const bookStyle = useAnimatedStyle(() => {
    const rise = between(intro.value, 0.12, 0.38);
    return {
      opacity: interpolate(intro.value, [0.06, 0.2], [0, 1]),
      transform: [
        { translateY: interpolate(rise, [0, 1], [30, -6]) },
        { scale: interpolate(rise, [0, 1], [0.9, 1]) },
        { rotate: `${interpolate(rise, [0, 1], [-2, 0])}deg` },
      ],
    };
  });
  const lightStyle = useAnimatedStyle(() => ({ opacity: between(intro.value, 0.38, 0.56) * 0.52 }));
  const pagesStyle = useAnimatedStyle(() => ({
    opacity: between(intro.value, 0.3, 0.52),
    transform: [{ scaleX: interpolate(between(intro.value, 0.3, 0.52), [0, 1], [0.72, 1]) }],
  }));

  return (
    <Animated.View style={[styles.bookWrap, bookStyle]} pointerEvents="none">
      <Animated.View style={[styles.bookGlow, lightStyle]} />
      <Svg width={224} height={140} viewBox="0 0 224 140">
        <Defs>
          <LinearGradient id="bookCover" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9B5D32" />
            <Stop offset="1" stopColor="#633721" />
          </LinearGradient>
          <LinearGradient id="bookPaper" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF2C9" />
            <Stop offset="1" stopColor="#DFAE62" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={112} cy={124} rx={101} ry={12} fill="#563A28" opacity={0.2} />
        <Path
          d="M17 83 C 19 59, 42 49, 73 55 L110 65 L110 123 C 76 114, 39 113, 25 121 C 17 116, 15 101, 17 83 Z"
          fill="url(#bookCover)"
          stroke="#51321F"
          strokeWidth={2.6}
        />
        <Path
          d="M207 83 C205 59, 182 49, 151 55 L114 65 L114 123 C148 114, 185 113, 199 121 C207 116, 209 101, 207 83 Z"
          fill="url(#bookCover)"
          stroke="#51321F"
          strokeWidth={2.6}
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, pagesStyle]}>
        <Svg width={224} height={140} viewBox="0 0 224 140">
          <Path
            d="M25 79 C 28 60, 47 56, 73 60 C 89 62, 101 68, 111 75 L111 117 C 87 108, 55 106, 31 114 C 24 102, 23 88, 25 79 Z"
            fill="url(#bookPaper)"
            stroke="#70462A"
            strokeWidth={1.8}
          />
          <Path
            d="M199 79 C196 60, 177 56, 151 60 C135 62, 123 68, 113 75 L113 117 C137 108, 169 106, 193 114 C200 102, 201 88, 199 79 Z"
            fill="url(#bookPaper)"
            stroke="#70462A"
            strokeWidth={1.8}
          />
          <Path d="M112 74 V119" stroke="#5D3924" strokeWidth={3.6} strokeLinecap="round" />
          <Path
            d="M47 83 C65 79, 82 82, 98 88 M45 91 C63 87, 81 90, 97 96 M127 88 C144 81, 162 79, 180 83 M127 96 C143 90, 161 87, 179 91"
            stroke="#BD8747"
            strokeWidth={1.25}
            opacity={0.52}
            fill="none"
          />
          <G fill="#F9D26E">
            <Path d="M103 53 l3 5 l5 2 l-5 2 l-3 5 l-2 -5 l-5 -2 l5 -2 Z" />
            <Path d="M123 43 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 Z" />
            <Circle cx={114} cy={55} r={2.5} />
          </G>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function MiniWorldArt({ id, size }: { id: WorldId; size: number }) {
  const outline = '#493A31';
  if (id === 'ocean') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <RadialGradient id="oceanOrb" cx="38%" cy="28%" rx="70%" ry="78%">
            <Stop offset="0" stopColor="#D9F2F1" />
            <Stop offset="0.5" stopColor="#70C3CD" />
            <Stop offset="1" stopColor="#267A91" />
          </RadialGradient>
        </Defs>
        <Path
          d="M20 65 C17 43 32 24 55 20 C75 14 100 31 103 54 C109 77 92 99 71 102 C46 109 23 92 20 65 Z"
          fill="url(#oceanOrb)"
          stroke="#367486"
          strokeWidth={2}
        />
        <Path
          d="M24 66 C39 57 49 69 62 63 C76 56 89 65 100 56 V82 C84 101 49 105 29 86 Z"
          fill="#318DA2"
          opacity={0.82}
        />
        <Path
          d="M25 48 C39 38 52 42 67 38 C79 35 89 38 96 45"
          fill="none"
          stroke="#F1FCF7"
          strokeWidth={3.2}
          strokeLinecap="round"
          opacity={0.62}
        />
        <Path
          d="M39 70 C48 59 66 59 76 66 C72 73 62 77 52 74 L45 81 L46 75 L37 74 Z"
          fill="#DBE5DE"
          stroke={outline}
          strokeWidth={1.5}
        />
        <Path
          d="M29 86 C32 74 38 74 40 88 M36 90 C40 78 45 79 47 92"
          stroke="#5C9C79"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Circle cx={82} cy={42} r={3.6} fill="#F8FFFF" opacity={0.82} />
        <Circle cx={90} cy={51} r={2.1} fill="#F8FFFF" opacity={0.7} />
      </Svg>
    );
  }
  if (id === 'space') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <RadialGradient id="spacePlanet" cx="35%" cy="28%" rx="70%" ry="72%">
            <Stop offset="0" stopColor="#DCD0F0" />
            <Stop offset="0.62" stopColor="#927BB9" />
            <Stop offset="1" stopColor="#54446F" />
          </RadialGradient>
        </Defs>
        <Path
          d="M28 72 C15 56 24 31 48 22 C70 11 97 25 100 48 C108 69 91 92 67 96 C47 102 29 91 28 72 Z"
          fill="url(#spacePlanet)"
          stroke={outline}
          strokeWidth={1.8}
        />
        <Path
          d="M31 58 C45 48 56 55 68 47 C79 40 89 44 98 53"
          fill="none"
          stroke="#E9DDF7"
          strokeWidth={4}
          opacity={0.32}
        />
        <Ellipse
          cx={60}
          cy={59}
          rx={52}
          ry={18}
          fill="none"
          stroke="#F3CE72"
          strokeWidth={2.1}
          transform="rotate(-23 60 59)"
        />
        <Path d="M91 31 l6 -5 l-1 8 l-5 3 Z" fill="#F4CD75" stroke={outline} strokeWidth={1.1} />
        <Circle cx={45} cy={48} r={5} fill="#7A63A5" opacity={0.65} />
        <Circle cx={66} cy={73} r={8} fill="#745A9C" opacity={0.62} />
        <Path
          d="M20 36 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z M98 77 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z"
          fill="#FFF2B1"
        />
      </Svg>
    );
  }
  if (id === 'dinosaur') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="dinoGrass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C9E29A" />
            <Stop offset="1" stopColor="#6C9B57" />
          </LinearGradient>
        </Defs>
        <Path
          d="M15 75 C16 59 31 45 49 44 C57 38 70 39 80 45 C99 46 109 62 104 78 C99 96 80 103 60 99 C39 105 15 94 15 75 Z"
          fill="#806143"
          stroke={outline}
          strokeWidth={1.8}
        />
        <Path
          d="M16 73 C27 52 44 49 58 53 C75 45 96 56 105 71 C103 89 82 95 61 91 C39 99 19 89 16 73 Z"
          fill="url(#dinoGrass)"
        />
        <Path d="M48 54 L56 26 L66 54" fill="#B95E43" stroke={outline} strokeWidth={1.6} />
        <Path d="M54 33 l3 -10 l4 11" fill="#F4E3B5" />
        <Path
          d="M27 70 l8 -19 l9 19 M35 68 l8 -24 l10 24"
          fill="#497A4A"
          stroke="#3F663D"
          strokeWidth={1.5}
        />
        <Path
          d="M76 78 C81 68 94 69 96 77 C93 84 83 83 78 86 L71 85 L74 80 Z"
          fill="#557B46"
          stroke={outline}
          strokeWidth={1.35}
        />
        <Circle cx={89} cy={75} r={1.4} fill={outline} />
        <Path
          d="M25 84 C42 81 54 88 67 83"
          fill="none"
          stroke="#D6B474"
          strokeWidth={1.4}
          opacity={0.7}
        />
      </Svg>
    );
  }
  if (id === 'animal') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Path
          d="M17 78 C18 59 33 45 52 48 C65 40 85 46 97 59 C108 73 101 92 84 98 C67 105 54 97 43 100 C26 99 14 91 17 78 Z"
          fill="#8AAE68"
          stroke={outline}
          strokeWidth={1.8}
        />
        <Path
          d="M20 80 C35 70 44 77 57 69 C70 62 86 72 100 66 V84 C86 99 50 101 24 90 Z"
          fill="#B7D28A"
        />
        <Path
          d="M29 70 l8 -28 l10 28 M49 68 l9 -35 l11 35 M76 70 l8 -27 l10 27"
          fill="#426B43"
          stroke="#35583A"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <Path d="M37 61 l-7 9 h15 Z M59 55 l-9 12 h18 Z M84 61 l-8 10 h17 Z" fill="#729A5E" />
        <Path
          d="M75 84 c5 -11 18 -9 19 1 l-4 7 h-15 Z"
          fill="#C9955D"
          stroke={outline}
          strokeWidth={1.3}
        />
        <Circle cx={88} cy={80} r={1.2} fill={outline} />
        <Path d="M24 88 C44 82 61 90 75 86" fill="none" stroke="#6F8F55" strokeWidth={2} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path
        d="M12 77 C19 58 32 54 45 58 C58 45 87 50 103 68 C110 84 96 97 76 98 C61 105 37 102 23 93 C15 89 10 84 12 77 Z"
        fill="#B98258"
        stroke={outline}
        strokeWidth={1.8}
      />
      <Path
        d="M19 77 l17 -27 l14 24 l17 -34 l19 38"
        fill="#789B78"
        stroke="#557159"
        strokeWidth={1.4}
      />
      <Path d="M14 87 C38 78 65 88 105 78 V88 C84 100 43 104 22 93 Z" fill="#D9BD7B" />
      <Path
        d="M28 84 C49 80 71 89 99 82"
        fill="none"
        stroke="#F7E4B9"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Path
        d="M77 76 h8 v-13 h-8 Z M88 78 h7 v-18 h-7 Z"
        fill="#E8D5A1"
        stroke="#815E45"
        strokeWidth={1.1}
      />
      <Path d="M80 63 v-5 M91 60 v-6" stroke="#815E45" strokeWidth={1} />
    </Svg>
  );
}

function WorldNode({
  summary,
  index,
  width,
  sceneHeight,
  intro,
  focus,
  focused,
  interactive,
  onPress,
  reducedMotion,
  compactLayout,
}: {
  summary: WorldSummary;
  index: number;
  width: number;
  sceneHeight: number;
  intro: SharedValue<number>;
  focus: SharedValue<number>;
  focused: boolean;
  interactive: boolean;
  onPress: () => void;
  reducedMotion: boolean | null;
  compactLayout: boolean;
}) {
  const position = compactLayout
    ? (compactScenePositions[summary.category.id] ?? scenePositions[summary.category.id])
    : scenePositions[summary.category.id];
  const size = position.size * Math.min(width / 390, sceneHeight / 680) * position.scale;
  const idleStyle = useIdleMotion(
    4600 + index * 650,
    index % 2 ? -3 : 3,
    interactive && !focused && !reducedMotion,
  );
  const press = useSharedValue(0);
  // Keep shared-value writes in event handlers declared before animated hooks.
  // This lets React Compiler distinguish user gestures from render mutations.
  const handlePressIn = () => {
    if (!reducedMotion) press.value = withTiming(1, { duration: 100 });
  };
  const handlePressOut = () => {
    press.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
  };
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.96]) }],
  }));
  const nodeStyle = useAnimatedStyle(() => {
    const emerge = reducedMotion
      ? 1
      : between(intro.value, position.emergeAt, position.emergeAt + 0.18);
    const centerX = width / 2 - position.x * width;
    const centerY = sceneHeight * 0.54 - position.y * sceneHeight;
    const focusScale = focused ? 3.8 : 0.86;
    return {
      opacity:
        interpolate(emerge, [0, 1], [0, 1]) *
        (focused ? 1 : interpolate(focus.value, [0, 1], [1, 0])),
      transform: [
        { translateX: interpolate(focus.value, [0, 1], [0, focused ? centerX : 0]) },
        {
          translateY:
            interpolate(emerge, [0, 1], [18, 0]) +
            interpolate(focus.value, [0, 1], [0, focused ? centerY : 0]),
        },
        {
          scale:
            interpolate(emerge, [0, 0.85, 1], [0.42, 1.04, 1]) *
            interpolate(focus.value, [0, 1], [1, focusScale]),
        },
      ],
    };
  });
  const stars = Math.min(3, Math.round((summary.progress ?? 0) * 3));
  const title = summary.category.title.replace(/ world$/i, '');
  const label = summary.locked
    ? `${summary.category.title}, locked. Open Parent Area to unlock.`
    : `Explore ${summary.category.title}`;

  return (
    <Animated.View
      style={[
        styles.worldNode,
        {
          left: position.x * width - size / 2,
          top: position.y * sceneHeight - size / 2,
          width: size + 26,
          height: size + 34,
        },
        nodeStyle,
      ]}
    >
      <AnimatedPressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={
          summary.locked ? 'Opens the Parent Area.' : 'Opens this discovery world.'
        }
        disabled={!interactive}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.worldButton, pressStyle, idleStyle, summary.locked && styles.lockedWorld]}
      >
        <MiniWorldArt id={summary.category.id} size={size} />
        <Text
          numberOfLines={1}
          style={[styles.worldLabel, { fontSize: Math.max(10, size * 0.13) }]}
        >
          {title}
        </Text>
        {summary.locked ? <Text style={styles.lockMark}>🔒</Text> : null}
        {stars > 0 ? <Text style={styles.worldStars}>{'✦'.repeat(stars)}</Text> : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

function ExplorerStatus({ opacity, top }: { opacity: SharedValue<number>; top: number }) {
  const identity = useExplorerStore((state) => state.identity);
  const item = explorerIdentityOptions.find((option) => option.id === identity);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0.74, 0.9], [0, 1]),
    transform: [{ translateY: interpolate(opacity.value, [0.74, 0.9], [-5, 0]) }],
  }));
  return (
    <Animated.View style={[styles.status, { top }, style]} pointerEvents="none">
      <View style={styles.statusAvatar}>
        <Text>{item?.emoji ?? '✦'}</Text>
      </View>
      <Text style={styles.statusName}>
        {item?.label.replace(' Explorer', '') ?? 'Little'}{' '}
        <Text style={styles.statusRole}>• Explorer</Text>
      </Text>
      <Text style={styles.statusStars}>✦ ✦ ☆</Text>
      <Text style={styles.statusLock}>🔒</Text>
    </Animated.View>
  );
}

/**
 * REFERENCE IMAGE IS A UX CONCEPT DIAGRAM, NOT A VISUAL STYLE REFERENCE.
 * DO NOT COPY ITS SHAPES, COLORS, LINES, OR TYPOGRAPHY.
 *
 * The discovery home is deliberately a scene, not a category list. Content,
 * progress, locks, and destinations still come from useWorldSummaries so this
 * remains compatible with Sanity and the existing progression model.
 */
export function DiscoverySelectionScreen({ navigation }: ExploreScreenProps<'DiscoverySelection'>) {
  const { summaries, isLoading } = useWorldSummaries();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const intro = useSharedValue(reducedMotion ? 1 : 0);
  const focus = useSharedValue(0);
  const [interactive, setInteractive] = useState(false);
  const [selectedId, setSelectedId] = useState<WorldId | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneHeight = Math.max(530, height - insets.top - 76);

  function enterWorld(summary: WorldSummary) {
    if (!interactive || selectedId) return;
    setSelectedId(summary.category.id);
    setInteractive(false);
    focus.value = reducedMotion
      ? 1
      : withTiming(1, { duration: 620, easing: Easing.inOut(Easing.cubic) });
    navigationTimer.current = setTimeout(
      () => {
        if (summary.locked) navigation.navigate('Parent', { screen: 'Area' });
        else navigation.navigate('WorldHome', { worldId: summary.category.id });
      },
      reducedMotion ? 60 : 610,
    );
  }

  useEffect(() => {
    if (reducedMotion) {
      intro.value = 1;
      const timer = setTimeout(() => setInteractive(true), 0);
      return () => clearTimeout(timer);
    }
    intro.value = 0;
    focus.value = 0;
    intro.value = withTiming(1, { duration: 2900, easing: Easing.inOut(Easing.cubic) });
    const timer = setTimeout(() => setInteractive(true), 2720);
    return () => clearTimeout(timer);
  }, [focus, intro, reducedMotion]);

  useEffect(
    () => () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    },
    [],
  );

  const roomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [1, 0.28]),
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.04]) }],
  }));
  const ollieStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(intro.value, [0.67, 0.82], [0, 1]) * interpolate(focus.value, [0, 1], [1, 0.25]),
    transform: [{ translateY: interpolate(intro.value, [0.67, 0.82], [14, 0]) }],
  }));
  const guidanceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0.8, 0.96], [0, 1]),
  }));
  const sceneSummaries = summaries
    .filter((summary) => sceneOrder.includes(summary.category.id))
    .sort((a, b) => sceneOrder.indexOf(a.category.id) - sceneOrder.indexOf(b.category.id));

  if (isLoading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ocean500} />
      </View>
    );

  return (
    <View style={styles.screen}>
      <Animated.View style={[StyleSheet.absoluteFill, roomStyle]}>
        <RoomBackdrop />
      </Animated.View>
      <ExplorerStatus opacity={intro} top={insets.top + 10} />
      <View style={[styles.scene, { height: sceneHeight, marginTop: insets.top + 4 }]}>
        <WonderBook intro={intro} />
        {sceneSummaries.map((summary) => (
          <WorldNode
            key={summary.category.id}
            summary={summary}
            index={sceneOrder.indexOf(summary.category.id)}
            width={width}
            sceneHeight={sceneHeight}
            intro={intro}
            focus={focus}
            focused={selectedId === summary.category.id}
            interactive={interactive}
            onPress={() => enterWorld(summary)}
            reducedMotion={reducedMotion}
            compactLayout={sceneSummaries.length <= 2}
          />
        ))}
        <Animated.View style={[styles.ollie, ollieStyle]} pointerEvents="none">
          <OllieCharacter size={88} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.guidance, guidanceStyle]} pointerEvents="none">
        <Text style={styles.guidanceText}>Choose your first adventure</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#BECBBC', overflow: 'hidden' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#BECBBC' },
  scene: { width: '100%', position: 'relative' },
  bookWrap: {
    width: 224,
    height: 140,
    position: 'absolute',
    left: '50%',
    marginLeft: -112,
    top: '57%',
    zIndex: 4,
  },
  bookGlow: {
    position: 'absolute',
    width: 205,
    height: 86,
    borderRadius: 100,
    backgroundColor: '#F7D67B',
    left: 10,
    top: 23,
    transform: [{ scaleY: 0.82 }],
  },
  worldNode: { position: 'absolute', zIndex: 6, alignItems: 'center' },
  worldButton: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
  },
  lockedWorld: { opacity: 0.56 },
  worldLabel: {
    marginTop: 1,
    color: '#fff8e8',
    fontFamily: fontFamily.displaySemiBold,
    textAlign: 'center',
    maxWidth: '100%',
    textShadowColor: '#463327',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockMark: {
    position: 'absolute',
    right: 1,
    top: 8,
    fontSize: 14,
  },
  worldStars: { position: 'absolute', top: -8, color: '#D69D34', fontSize: 11 },
  ollie: { position: 'absolute', zIndex: 7, left: '50%', marginLeft: -44, top: '71%' },
  status: {
    position: 'absolute',
    left: 22,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusAvatar: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#FFF8E9',
    borderWidth: 1,
    borderColor: '#D09A52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  statusName: {
    color: '#483523',
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 12,
    flexShrink: 1,
  },
  statusRole: { color: '#775D3B', fontFamily: fontFamily.bodyRegular, fontSize: 10 },
  statusStars: { marginLeft: 'auto', color: '#C88E2B', fontSize: 11, letterSpacing: 1 },
  statusLock: { marginLeft: 10, fontSize: 14 },
  guidance: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: '#FFF9EC',
    borderWidth: 1,
    borderColor: '#DFC190',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  guidanceText: { color: '#563B22', fontFamily: fontFamily.displaySemiBold, fontSize: 14 },
});
