import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

import type { WorldId } from '@constants/tokens';

/**
 * Full route table — docs/design/01-screen-map.md. Extend here whenever a
 * screen is added; every `navigate()` call in the app resolves its types
 * from these, per docs/implementation/00-tech-stack.md's "typed navigation
 * only" rule.
 */

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  ExplorerIdentity: undefined;
};

export type MainTabParamList = {
  Explore: NavigatorScreenParams<ExploreStackParamList>;
  /** Single screen (docs/design/01-screen-map.md) — the "Quick Recall" view is an in-place modal, not a route, so no nested stack is needed here. */
  Collection: undefined;
  Parent: NavigatorScreenParams<ParentStackParamList>;
};

export type ExploreStackParamList = {
  DiscoverySelection: undefined;
  WorldHome: { worldId: WorldId };
  DiscoveryCard: { deckId: string };
  Completion: { deckId: string };
};

export type ParentStackParamList = {
  /**
   * Initial route. Self-gates: renders `ParentalGate` until the session is
   * unlocked (docs/design/01-screen-map.md — "the gate guards the entire
   * tab"), then the real trust hub. Not a separate "Gate" route, so passing
   * the gate doesn't leave a back-button entry pointing at it.
   */
  Area: undefined;
  PackPreview: { deckId: string };
};

// --- Per-navigator screen prop helpers -------------------------------------

export type OnboardingScreenProps<Screen extends keyof OnboardingStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OnboardingStackParamList, Screen>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type CollectionScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Collection'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ExploreScreenProps<Screen extends keyof ExploreStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ExploreStackParamList, Screen>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Explore'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type ParentScreenProps<Screen extends keyof ParentStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ParentStackParamList, Screen>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Parent'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

declare global {
  namespace ReactNavigation {
    // This is React Navigation's documented pattern for global type
    // augmentation — the empty body is intentional, not a mistake.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
