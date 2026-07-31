import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

/**
 * Route tables for the two navigators set up in Phase 1. No feature screens
 * exist yet — "Home" is the scaffold placeholder in app/, not a feature
 * screen. Extend these param lists as real screens are added.
 */
export type RootTabParamList = {
  Home: undefined;
};

export type RootStackParamList = {
  Root: NavigatorScreenParams<RootTabParamList>;
};

export type RootTabScreenProps<Screen extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;

// Lets every `useNavigation()` / `navigate()` call in the app resolve its
// types from RootStackParamList automatically — this is what
// "Typed navigation only. No untyped navigate() calls." (00-tech-stack.md)
// depends on.
declare global {
  namespace ReactNavigation {
    // This is React Navigation's documented pattern for global type
    // augmentation — the empty body is intentional, not a mistake.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
