import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { islandScene } from '@constants/tokens';

interface OllieCharacterProps {
  size?: number;
  /** Enables the idle breathe. The scene's arrival motion is applied by the caller. */
  animated?: boolean;
}

/**
 * Ollie — the guide who lives on Discovery Island.
 *
 * PLACEHOLDER ART. The repo ships no Ollie asset yet
 * (docs/design/04-asset-strategy.md#mascot-strategy), and the existing
 * `components/ExplorerCharacter` is a different character (the yellow explorer
 * used by Avatar and the reward moments), so it is left untouched rather than
 * recoloured into Ollie. Everything below is a self-contained SVG with no
 * external dependency: swapping in final artwork means replacing the body of
 * this one component, and the props contract (`size`, `animated`) holds.
 *
 * He is drawn small on purpose — roughly a sixth of the frame width — so he
 * reads as a character standing in a world, not as a splash-screen mascot.
 */
export function OllieCharacter({ size = 96, animated = true }: OllieCharacterProps) {
  const reducedMotion = useReducedMotion();
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!animated || reducedMotion) {
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [animated, reducedMotion, breathe]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.03 }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ollie, your island guide"
      style={[breatheStyle, { width: size, height: size, transformOrigin: '50% 100%' }]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" pointerEvents="none">
        {/* Contact shadow — grounds him on the grass. */}
        <Ellipse cx={50} cy={90} rx={24} ry={5} fill={islandScene.grassDeep} opacity={0.22} />

        {/* Tail, drawn behind the body. */}
        <Path
          d="M74 68 C 88 66, 94 54, 89 43 C 98 50, 99 70, 82 78 Z"
          fill={islandScene.ollieAccentDark}
        />

        {/* Ears. */}
        <Path d="M30 26 C 24 12, 31 5, 40 15 Z" fill={islandScene.ollieAccentDark} />
        <Path d="M70 26 C 76 12, 69 5, 60 15 Z" fill={islandScene.ollieAccentDark} />

        <Path
          d="M50 14 C 70 14, 83 30, 83 50 C 83 72, 68 87, 50 87 C 32 87, 17 72, 17 50 C 17 30, 30 14, 50 14 Z"
          fill={islandScene.ollieAccent}
        />
        <Ellipse cx={50} cy={72} rx={16} ry={11} fill={islandScene.ollieBelly} opacity={0.75} />

        {/* One arm reaching out toward the world — the "come and see" gesture. */}
        <Path
          d="M20 54 C 10 52, 4 46, 6 40 C 12 40, 20 44, 24 50 Z"
          fill={islandScene.ollieAccentDark}
        />

        <G>
          <Ellipse cx={38} cy={62} rx={6} ry={4} fill={islandScene.ollieCheek} opacity={0.55} />
          <Ellipse cx={62} cy={62} rx={6} ry={4} fill={islandScene.ollieCheek} opacity={0.55} />
          <Circle cx={41} cy={49} r={4.2} fill={islandScene.ink} />
          <Circle cx={59} cy={49} r={4.2} fill={islandScene.ink} />
          <Circle cx={42.4} cy={47.6} r={1.4} fill={islandScene.cloud} />
          <Circle cx={60.4} cy={47.6} r={1.4} fill={islandScene.cloud} />
          <Path
            d="M45 58 C 47.5 61.5, 52.5 61.5, 55 58"
            stroke={islandScene.ink}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </G>

        <Ellipse cx={40} cy={86} rx={9} ry={5} fill={islandScene.ollieAccentDark} />
        <Ellipse cx={61} cy={86} rx={9} ry={5} fill={islandScene.ollieAccentDark} />
      </Svg>
    </Animated.View>
  );
}
