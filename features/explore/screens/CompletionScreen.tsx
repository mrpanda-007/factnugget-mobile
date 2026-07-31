import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@components/Button';
import { RewardAnimation } from '@components/RewardAnimation';
import { WorldBackground } from '@components/WorldBackground';
import { worldThemes } from '@constants/tokens';
import * as ContentRepository from '@repositories/ContentRepository';
import type { Deck } from '@app-types/Deck';
import type { ExploreScreenProps } from '@navigation/types';

/**
 * The celebration — docs/design/01-screen-map.md "Completion". Never
 * autoplay, never forced continuation: the child gets one explicit choice
 * once the reward sequence settles (docs/product/02-user-flows.md Step 8).
 */
export function CompletionScreen({ route, navigation }: ExploreScreenProps<'Completion'>) {
  const { deckId } = route.params;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ContentRepository.getDeck(deckId).then((result) => {
      if (!cancelled) setDeck(result);
    });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  if (!deck) {
    return <View className="flex-1 bg-cream" />;
  }

  const theme = worldThemes[deck.category];

  return (
    <View className="flex-1 bg-cream">
      <WorldBackground world={theme} intensity="full" />
      <View className="flex-1 items-center justify-center gap-2xl px-xl">
        <Text className="text-center font-fredoka-semibold text-display-lg text-ink-900">
          You discovered {deck.title}!
        </Text>

        <RewardAnimation badge={deck.rewardBadge} onComplete={() => setShowChoices(true)} />

        {showChoices ? (
          <Animated.View entering={FadeIn.duration(300)} className="w-full gap-md">
            <Text className="text-center font-nunito-semibold text-body-md text-ink-600">
              Great discovery! What next?
            </Text>
            <Button
              label="Continue Exploring"
              color={theme.primary}
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: 'DiscoverySelection' }] })
              }
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
