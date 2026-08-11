import { useEffect, useState } from 'react';
import {
  Easing,
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * The first-open sequence, in one place.
 *
 * Every number below is a milestone on a single timeline rather than a
 * per-component guess, so the arrival can be retimed here without touching any
 * of the scene layers. The camera itself is one progress value (0 = the island
 * is a speck in an empty sky, 1 = you have arrived); the layers each read it at
 * their own rate, which is where the parallax comes from.
 */
export const introTimeline = {
  /** Frame one is deliberately just sky — the island is out there, far away. */
  cameraDelay: 280,
  cameraDuration: 1520,
  titleDelay: 1000,
  titleDuration: 900,
  ollieLiftDuration: 320,
  ollieSettleDuration: 300,
  ollieDelay: 1700,
  ctaDelay: 2100,
  ctaDuration: 500,
  /** Ambient cloud drift only starts once the camera has stopped. */
  ambientDelay: 2400,
  ambientDuration: 5600,
  /** Reduced motion gets this fade instead of the whole 2.6s arrival. */
  reducedMotionFade: 220,
} as const;

export interface DiscoveryIntroAnimation {
  /** Whole-scene opacity. Only does anything in the reduced-motion path. */
  sceneFade: SharedValue<number>;
  /** 0 → 1 camera push-in. Every layer derives its scale/offset from this. */
  camera: SharedValue<number>;
  title: SharedValue<number>;
  /** 0 → 1 → 0 hop as Ollie notices you. */
  ollieSettle: SharedValue<number>;
  cta: SharedValue<number>;
  /** Endless 0 ↔ 1 ping-pong driving the cloud drift. */
  drift: SharedValue<number>;
  /**
   * True once the arrival has played out. The CTA stays non-interactive until
   * then so a tap during the fly-in can't fire a half-visible control.
   */
  isSettled: boolean;
  reducedMotion: boolean;
}

export function useDiscoveryIntroAnimation(): DiscoveryIntroAnimation {
  const reducedMotion = useReducedMotion();
  // Only the played-out sequence flips this. Reduced motion is folded in at the
  // return instead of via setState, since there is no arrival to wait for and
  // writing state from the effect body would just cost a second render.
  const [isSequenceSettled, setIsSequenceSettled] = useState(false);

  const sceneFade = useSharedValue(reducedMotion ? 0 : 1);
  const camera = useSharedValue(0);
  const title = useSharedValue(0);
  const ollieSettle = useSharedValue(0);
  const cta = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      // Land on the settled composition immediately; the only motion is a short
      // opacity fade so the screen doesn't hard-cut in.
      camera.value = 1;
      title.value = 1;
      cta.value = 1;
      ollieSettle.value = 0;
      drift.value = 0;
      sceneFade.value = withTiming(1, { duration: introTimeline.reducedMotionFade });
      return;
    }

    sceneFade.value = 1;

    camera.value = withDelay(
      introTimeline.cameraDelay,
      withTiming(1, {
        duration: introTimeline.cameraDuration,
        // Ease-out only: a camera that overshoots and springs back reads as a
        // bouncy UI transition, not as travel.
        easing: Easing.out(Easing.cubic),
      }),
    );

    title.value = withDelay(
      introTimeline.titleDelay,
      withTiming(1, {
        duration: introTimeline.titleDuration,
        easing: Easing.out(Easing.quad),
      }),
    );

    ollieSettle.value = withDelay(
      introTimeline.ollieDelay,
      withSequence(
        withTiming(1, {
          duration: introTimeline.ollieLiftDuration,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, {
          duration: introTimeline.ollieSettleDuration,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
    );

    cta.value = withDelay(
      introTimeline.ctaDelay,
      withTiming(
        1,
        { duration: introTimeline.ctaDuration, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(setIsSequenceSettled)(true);
          }
        },
      ),
    );

    drift.value = withDelay(
      introTimeline.ambientDelay,
      withRepeat(
        withTiming(1, {
          duration: introTimeline.ambientDuration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, [reducedMotion, sceneFade, camera, title, ollieSettle, cta, drift]);

  return {
    sceneFade,
    camera,
    title,
    ollieSettle,
    cta,
    drift,
    isSettled: reducedMotion || isSequenceSettled,
    reducedMotion,
  };
}
