import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { worldThemes } from '@constants/tokens';
import * as ContentRepository from '@repositories/ContentRepository';
import type { Deck } from '@app-types/Deck';
import type { ParentScreenProps } from '@navigation/types';

const trustBadges = ['No ads', 'Safe content', 'Child-friendly', 'Expert reviewed'];

/**
 * Parent-facing pack detail + purchase decision —
 * docs/design/01-screen-map.md "Pack Preview". UI shell only: the purchase
 * button is disabled with an explanatory note since StoreKit 2 / Play
 * Billing integration (docs/implementation/09-purchases.md) is a separate,
 * later phase — no fake purchase flow that looks functional but isn't.
 */
export function PackPreviewScreen({ route }: ParentScreenProps<'PackPreview'>) {
  const { deckId } = route.params;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    ContentRepository.getDeck(deckId).then((result) => {
      if (!cancelled) {
        setDeck(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  if (isLoading) {
    return <View className="flex-1 bg-cream" />;
  }

  if (!deck) {
    return (
      <View className="flex-1 items-center justify-center gap-md bg-cream px-xl">
        <Text style={{ fontSize: 40 }}>🚧</Text>
        <Text className="text-center font-nunito-semibold text-body-md text-ink-600">
          This pack isn&apos;t ready to preview yet.
        </Text>
      </View>
    );
  }

  const theme = worldThemes[deck.category];

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="gap-xl px-lg pb-3xl pt-4xl">
      <View className="items-center gap-sm">
        <Text style={{ fontSize: 48 }}>{theme.emoji}</Text>
        <Text className="font-fredoka-bold text-display-lg text-ink-900">{deck.title}</Text>
        <Text className="text-center font-nunito-regular text-body-md text-ink-600">
          {deck.subtitle}
        </Text>
      </View>

      <View className="gap-sm rounded-lg bg-surface p-lg">
        <Text className="font-nunito-extrabold text-label text-ink-600">INCLUDES</Text>
        <Text className="font-nunito-semibold text-body-md text-ink-900">
          {deck.discoveryIds.length} discoveries
        </Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">Age 5–8 years</Text>
      </View>

      <View className="flex-row flex-wrap gap-sm">
        {trustBadges.map((label) => (
          <Badge key={label} icon="✓" label={label} />
        ))}
      </View>

      <View className="gap-sm">
        <Button label="Unlock This Pack" disabled color={theme.primary} onPress={() => {}} />
        <Text className="text-center font-nunito-regular text-body-sm text-ink-400">
          Purchases aren&apos;t available in this preview yet.
        </Text>
      </View>
    </ScrollView>
  );
}
