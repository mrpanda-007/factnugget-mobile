import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { WorldBadge } from '@features/rewards/components/WorldBadge';
import { PackPurchaseSection } from '@features/parent/components/PackPurchaseSection';
import { colors, worldThemes } from '@constants/tokens';
import * as ContentRepository from '@repositories/ContentRepository';
import { getCommerceDependencies } from '../../../application/commerce/commerceRuntime';
import { parseLearningPackId } from '@app-types/domain/ids';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import type { LearningPack } from '@app-types/domain/content';
import type { ParentScreenProps } from '@navigation/types';

function readingTimeLabel(discoveries: Discovery[]) {
  const seconds = discoveries.reduce(
    (total, discovery) => total + discovery.estimatedReadingTime,
    0,
  );
  if (seconds <= 0) return null;
  const minutes = Math.ceil(seconds / 60);
  return `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} of reading`;
}

/**
 * Parent-facing Learning Pack explanation. Canonical Pack access is resolved
 * before Store metadata; child-facing screens never render this commerce UI.
 */
export function PackPreviewScreen({ navigation, route }: ParentScreenProps<'PackPreview'>) {
  const { deckId } = route.params;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [pack, setPack] = useState<LearningPack | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ContentRepository.getDeck(deckId),
      ContentRepository.getDiscoveriesForDeck(deckId),
      getCommerceDependencies().content.getLearningPack(parseLearningPackId(deckId)),
    ]).then(([nextDeck, nextDiscoveries, nextPack]) => {
      if (!cancelled) {
        setDeck(nextDeck);
        setDiscoveries(nextDiscoveries);
        setPack(nextPack);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const estimatedReadingTime = useMemo(() => readingTimeLabel(discoveries), [discoveries]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color={colors.ocean500} />
      </View>
    );
  }

  if (!deck || !pack) {
    return (
      <View className="flex-1 items-center justify-center gap-md bg-cream px-xl">
        <Text
          accessibilityRole="header"
          className="text-center font-fredoka-semibold text-display-md text-ink-900"
        >
          This Learning Pack isn&apos;t ready to preview yet
        </Text>
        <Button
          label="Back to Parent Area"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    );
  }

  const theme = worldThemes[deck.category];

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="gap-xl px-lg pb-3xl pt-4xl"
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center gap-sm">
        <Text accessibilityElementsHidden style={{ fontSize: 48 }}>
          {theme.emoji}
        </Text>
        <Text
          accessibilityRole="header"
          className="text-center font-fredoka-bold text-display-lg text-ink-900"
        >
          {pack.title}
        </Text>
        <Text className="text-center font-nunito-regular text-body-md text-ink-600">
          {pack.subtitle}
        </Text>
      </View>

      <Card className="gap-sm" padding="lg">
        <Text className="font-nunito-extrabold text-label text-ink-600">LEARNING PACK</Text>
        <Text className="font-nunito-semibold text-body-md text-ink-900">
          A finite set of Discoveries your child can explore at their own pace.
        </Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">
          {discoveries.length} {discoveries.length === 1 ? 'Discovery' : 'Discoveries'} · Ages 5–8
          {estimatedReadingTime ? ` · ${estimatedReadingTime}` : ''}
        </Text>
      </Card>

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          What&apos;s included
        </Text>
        <Text className="font-nunito-regular text-body-md text-ink-600">
          Every Discovery includes a visual, one memorable fact, and a child-friendly explanation.
          Completed Discoveries are saved in My Discoveries.
        </Text>
        <View className="gap-sm">
          {discoveries.map((discovery) => (
            <Card key={discovery.id} padding="md" className="flex-row items-center gap-md">
              <DiscoveryIllustration discovery={discovery} size={56} />
              <View
                accessible
                accessibilityLabel={`${discovery.title}. Sample fact: ${discovery.funFact}`}
                className="flex-1 gap-xs"
              >
                <Text className="font-nunito-extrabold text-body-md text-ink-900">
                  {discovery.title}
                </Text>
                <Text className="font-nunito-regular text-body-sm text-ink-600" numberOfLines={2}>
                  {discovery.funFact}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </View>

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          Completion
        </Text>
        <Text className="font-nunito-regular text-body-md text-ink-600">
          Finish every Discovery to earn this World Badge.
        </Text>
        <WorldBadge
          worldId={deck.category}
          worldTitle={worldThemes[deck.category].label}
          title={deck.rewardBadge.label}
          icon={deck.rewardBadge.icon}
          statusLabel="World completion badge"
        />
      </View>

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          Built with clear limits
        </Text>
        <Card className="gap-sm" padding="lg">
          <Text className="font-nunito-semibold text-body-md text-ink-900">
            Designed for ages 5–8
          </Text>
          <Text className="font-nunito-semibold text-body-md text-ink-900">No ads</Text>
          <Text className="font-nunito-semibold text-body-md text-ink-900">
            Finite {discoveries.length}-Discovery experience
          </Text>
        </Card>
      </View>

      <PackPurchaseSection
        pack={pack}
        onOpenPack={() =>
          navigation.navigate('Explore', {
            screen: 'WorldHome',
            params: { worldId: deck.category },
          })
        }
      />

      <Button label="Back to Parent Area" onPress={() => navigation.goBack()} variant="secondary" />
    </ScrollView>
  );
}
