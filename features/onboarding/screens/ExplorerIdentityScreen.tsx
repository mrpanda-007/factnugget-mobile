import { ExplorerLookPicker } from '@components/ExplorerLookPicker';
import type { OnboardingScreenProps } from '@navigation/types';

/**
 * docs/design/01-screen-map.md's Explorer Identity Selection screen. No
 * `onSaved` — once chooseIdentity lands, `identity` stops being null and
 * RootNavigator swaps the whole Onboarding stack for Main on its own.
 */
export function ExplorerIdentityScreen({ navigation }: OnboardingScreenProps<'ExplorerIdentity'>) {
  return (
    <ExplorerLookPicker
      title="Choose Your Explorer Look"
      ctaLabel="BECOME AN EXPLORER"
      onBack={() => navigation.goBack()}
    />
  );
}
