import { useMemo } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { fontFamily, islandScene, spacing } from '@constants/tokens';
import { ForegroundFoliage } from '@features/onboarding/components/ForegroundFoliage';
import {
  DiscoveryIsland,
  ISLAND_ASPECT,
  ISLAND_GROUND_X,
  ISLAND_GROUND_Y,
} from '@features/onboarding/components/DiscoveryIsland';
import { OllieCharacter } from '@features/onboarding/components/OllieCharacter';
import { SkyBackdrop } from '@features/onboarding/components/SkyBackdrop';
import { StorybookButton } from '@features/onboarding/components/StorybookButton';
import { StorybookCloud } from '@features/onboarding/components/StorybookCloud';
import { useDiscoveryIntroAnimation } from '@features/onboarding/hooks/useDiscoveryIntroAnimation';

/**
 * Scene geometry as fractions of the viewport, never pixels — the composition
 * has to hold from a 320pt SE to a 430pt Pro Max, and the only way to keep the
 * island "slightly below centre, slightly right of centre" on all of them is to
 * derive every coordinate from the measured window.
 */
const SCENE = {
  /**
   * The vanishing point. Layers scale about *this* rather than their own
   * centres, which is what makes the intro read as a camera travelling toward
   * the island instead of a set of boxes independently growing.
   */
  camera: { x: 0.53, y: 0.56 },
  island: { centerX: 0.53, topY: 0.44, width: 0.8, maxWidth: 460 },
  ollie: { width: 0.19, maxWidth: 112 },
  title: { topY: 0.26 },
  foliage: { height: 0.28 },
  clouds: [
    { x: 0.06, y: 0.115, width: 0.36, opacity: 0.95, variant: 0, drift: 5 },
    { x: 0.68, y: 0.17, width: 0.3, opacity: 0.72, variant: 1, drift: -7 },
    { x: 0.44, y: 0.05, width: 0.19, opacity: 0.55, variant: 2, drift: 3 },
  ],
  /** Distant specks — birds too far away to be anything but marks. */
  specks: [
    { x: 0.26, y: 0.21, size: 4, opacity: 0.32 },
    { x: 0.63, y: 0.09, size: 3, opacity: 0.28 },
    { x: 0.85, y: 0.3, size: 5, opacity: 0.22 },
    { x: 0.16, y: 0.33, size: 3, opacity: 0.26 },
  ],
} as const;

interface DriftingCloudProps {
  drift: SharedValue<number>;
  left: number;
  top: number;
  width: number;
  variant: number;
  opacity: number;
  amplitude: number;
}

/** A few pixels of sway over ~5.6s — present, but never something you catch. */
function DriftingCloud({
  drift,
  left,
  top,
  width,
  variant,
  opacity,
  amplitude,
}: DriftingCloudProps) {
  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * amplitude }],
  }));

  return (
    <Animated.View style={[driftStyle, { position: 'absolute', left, top }]}>
      <StorybookCloud width={width} variant={variant} opacity={opacity} />
    </Animated.View>
  );
}

interface ParallaxIntroSceneProps {
  /** Fires on the CTA. The scene owns no navigation of its own. */
  onExplore: () => void;
}

/**
 * Screen 1 — Ollie's Discovery Island, first app open.
 *
 * Five stacked layers (sky → atmosphere → island+Ollie → near foliage → UI),
 * all driven from the single `camera` progress value in
 * `useDiscoveryIntroAnimation`. Each layer reads that value at a different
 * rate, so the clouds barely move, the island grows from a speck, and the
 * foliage sweeps past the lens: parallax out of one animation, with nothing to
 * keep in sync by hand.
 */
export function ParallaxIntroScene({ onExplore }: ParallaxIntroSceneProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { sceneFade, camera, title, ollieSettle, cta, isSettled, drift, reducedMotion } =
    useDiscoveryIntroAnimation();

  const layout = useMemo(() => {
    const islandWidth = Math.min(width * SCENE.island.width, SCENE.island.maxWidth);
    const islandHeight = islandWidth * ISLAND_ASPECT;
    const islandLeft = width * SCENE.island.centerX - islandWidth / 2;
    const islandTop = height * SCENE.island.topY;
    const ollieSize = Math.min(width * SCENE.ollie.width, SCENE.ollie.maxWidth);

    // "Welcome Explorer" is 16 characters of Fredoka — on anything narrower
    // than a Pro Max it only fits by shrinking past the point where it reads as
    // a storybook title, so narrow phones get a deliberate two-line break
    // rather than whatever the layout engine would have chosen.
    const stackTitle = width < 400;
    const titleFontSize = Math.round(
      Math.min(Math.max(width * (stackTitle ? 0.108 : 0.084), 30), 46),
    );

    return {
      islandWidth,
      islandHeight,
      islandLeft,
      islandTop,
      ollieSize,
      ollieLeft: islandLeft + islandWidth * ISLAND_GROUND_X - ollieSize / 2,
      ollieTop: islandTop + islandHeight * ISLAND_GROUND_Y - ollieSize,
      cameraOriginX: width * SCENE.camera.x,
      cameraOriginY: height * SCENE.camera.y,
      foliageHeight: height * SCENE.foliage.height,
      titleTop: height * SCENE.title.topY,
      stackTitle,
      titleFontSize,
      titleLineHeight: Math.round(titleFontSize * 1.14),
      ctaBottom: Math.max(insets.bottom, spacing.md) + spacing.xl,
    };
  }, [width, height, insets.bottom]);

  const cameraOrigin = [layout.cameraOriginX, layout.cameraOriginY, 0];

  // Far clouds travel ~0.25× the camera, the island ~0.7×, the foliage past
  // 1× — the ratios that read as depth. Tuned by eye, not derived.
  const atmosphereStyle = useAnimatedStyle(() => ({
    opacity: interpolate(camera.value, [0, 0.45], [0.25, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(camera.value, [0, 1], [-8, 0]) },
      { scale: interpolate(camera.value, [0, 1], [0.62, 1]) },
    ],
  }));

  const islandStyle = useAnimatedStyle(() => ({
    opacity: interpolate(camera.value, [0, 0.15], [0.8, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(camera.value, [0, 1], [-24, 0]) },
      { scale: interpolate(camera.value, [0, 1], [0.2, 1]) },
    ],
  }));

  const foliageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(camera.value, [0.18, 0.62], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(camera.value, [0, 1], [height * 0.06, 0]) },
      { scale: interpolate(camera.value, [0.08, 1], [0.16, 1], Extrapolation.CLAMP) },
    ],
  }));

  const ollieStyle = useAnimatedStyle(() => ({
    opacity: interpolate(camera.value, [0.35, 0.75], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(ollieSettle.value, [0, 1], [0, -layout.ollieSize * 0.1]) },
      { scale: interpolate(ollieSettle.value, [0, 1], [1, 1.03]) },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [
      { translateY: interpolate(title.value, [0, 1], [12, 0]) },
      { scale: interpolate(title.value, [0, 1], [0.97, 1]) },
    ],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: cta.value,
    transform: [{ translateY: interpolate(cta.value, [0, 1], [10, 0]) }],
  }));

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneFade.value }));

  return (
    <Animated.View style={[sceneStyle, { flex: 1, backgroundColor: islandScene.skyLight }]}>
      {/* Layer 1 — far sky. No parallax: it is the thing everything else moves against. */}
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <SkyBackdrop width={width} height={height} />
      </View>

      {/* Layer 2 — atmosphere. */}
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          atmosphereStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transformOrigin: cameraOrigin,
          },
        ]}
      >
        {SCENE.clouds.map((cloud, index) => (
          <DriftingCloud
            key={index}
            drift={drift}
            left={width * cloud.x}
            top={height * cloud.y}
            width={width * cloud.width}
            variant={cloud.variant}
            opacity={cloud.opacity}
            amplitude={reducedMotion ? 0 : cloud.drift}
          />
        ))}
        {SCENE.specks.map((speck, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: width * speck.x,
              top: height * speck.y,
              width: speck.size,
              height: speck.size,
              borderRadius: speck.size / 2,
              backgroundColor: islandScene.cloud,
              opacity: speck.opacity,
            }}
          />
        ))}
      </Animated.View>

      {/* Layer 3 — the island and its guide. */}
      <Animated.View
        pointerEvents="none"
        style={[
          islandStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transformOrigin: cameraOrigin,
          },
        ]}
      >
        <View style={{ position: 'absolute', left: layout.islandLeft, top: layout.islandTop }}>
          <DiscoveryIsland width={layout.islandWidth} />
        </View>
        <Animated.View
          style={[
            ollieStyle,
            {
              position: 'absolute',
              left: layout.ollieLeft,
              top: layout.ollieTop,
              transformOrigin: [layout.ollieSize / 2, layout.ollieSize, 0],
            },
          ]}
        >
          <OllieCharacter size={layout.ollieSize} animated={!reducedMotion} />
        </Animated.View>
      </Animated.View>

      {/* Layer 4 — near foliage, cropped by the frame. */}
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          foliageStyle,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: layout.foliageHeight,
            // Anchored to the bottom edge rather than the vanishing point: the
            // foreground is level with the lens, so it should sweep down out of
            // frame as the camera arrives. Scaling it about the island instead
            // lifts the band's bottom edge off the screen mid-flight and leaves
            // a visible strip of bare sky under it.
            transformOrigin: [width / 2, layout.foliageHeight, 0],
          },
        ]}
      >
        <ForegroundFoliage width={width} height={layout.foliageHeight} />
      </Animated.View>

      {/* Layer 5 — UI, kept to two elements so the scene stays the interface. */}
      <Animated.View
        style={[
          titleStyle,
          {
            position: 'absolute',
            top: layout.titleTop,
            left: spacing.xl,
            right: spacing.xl,
            alignItems: 'center',
          },
        ]}
      >
        {/*
          The one place in the app that opts out of OS font scaling: the line
          break is chosen above from the measured width, and a scaled-up title
          would reflow into the island and undo that. The CTA below keeps
          scaling — it is the element that has to stay legible.
        */}
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: fontFamily.displayBold,
            fontSize: layout.titleFontSize,
            lineHeight: layout.titleLineHeight,
            color: islandScene.ink,
            textAlign: 'center',
          }}
        >
          {layout.stackTitle ? 'Welcome\nExplorer' : 'Welcome Explorer'}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          ctaStyle,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: layout.ctaBottom,
            alignItems: 'center',
          },
        ]}
      >
        <StorybookButton label="Let's Explore" onPress={onExplore} disabled={!isSettled} />
      </Animated.View>
    </Animated.View>
  );
}
