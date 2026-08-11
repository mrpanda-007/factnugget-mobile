import { View } from 'react-native';

import { ParallaxIntroScene } from '@features/onboarding/components/ParallaxIntroScene';
import type { OnboardingScreenProps } from '@navigation/types';

/**
 * First-run wonder moment — docs/design/01-screen-map.md. No login, no
 * email, no parent setup: the child experiences value before any commitment
 * (docs/product/02-user-flows.md Step 1).
 *
 * The screen is deliberately thin. Everything visual lives in
 * `ParallaxIntroScene` — a wide establishing shot of Ollie's Discovery Island
 * that the camera pushes into over ~2.6s — because the scene *is* the
 * interface here, and the only thing that belongs at screen level is the route
 * the CTA leads to. Route name stays `Welcome` (navigation/types.ts) so the
 * Onboarding stack and its typing are untouched.
 */
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  return (
    // The scene is edge-to-edge on purpose: safe-area padding is applied per
    // element inside it (the CTA lifts off the home indicator) rather than
    // insetting the sky, which would leave letterbox bands on notched devices.
    <View className="flex-1 bg-cream">
      <ParallaxIntroScene onExplore={() => navigation.navigate('ExplorerIdentity')} />
    </View>
  );
}
