import { ExplorerLookPicker } from '@components/ExplorerLookPicker';
import { useExplorerStore } from '@store/useExplorerStore';
import type { ExploreScreenProps } from '@navigation/types';

/**
 * Lets an explorer revisit the cosmetic look they picked during onboarding,
 * reached from the Explore header avatar. Changing a look keeps the same
 * explorer row — and so every discovery already collected — because
 * ExplorerRepository#createOrUpdateActiveExplorer updates in place.
 */
export function ChangeLookScreen({ navigation }: ExploreScreenProps<'ChangeLook'>) {
  const identity = useExplorerStore((state) => state.identity);

  return (
    <ExplorerLookPicker
      title="Change Your Explorer Look"
      ctaLabel="SAVE LOOK"
      initialSelectedId={identity}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.goBack()}
    />
  );
}
