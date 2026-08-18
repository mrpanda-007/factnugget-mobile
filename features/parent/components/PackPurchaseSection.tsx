import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { colors } from '@constants/tokens';
import type { LearningPack } from '@app-types/domain/content';
import { usePackPurchase } from '@features/parent/hooks/usePackPurchase';
import type { PackPurchaseDependencies } from '@features/parent/hooks/packPurchaseModel';

interface PackPurchaseSectionProps {
  pack: LearningPack;
  onOpenPack: () => void;
  dependencies?: PackPurchaseDependencies;
}

/** Parent-only lower action area. Store price data never reaches child screens. */
export function PackPurchaseSection({ pack, onOpenPack, dependencies }: PackPurchaseSectionProps) {
  const purchase = usePackPurchase(pack, dependencies);
  const isOwned = purchase.status === 'owned';
  const canBuy = purchase.status === 'available' || purchase.status === 'cancelled';

  return (
    <View className="gap-md">
      <Text
        accessibilityRole="header"
        className="font-fredoka-semibold text-display-md text-ink-900"
      >
        {isOwned ? 'Ready to explore' : 'Purchase options'}
      </Text>
      <Card className="gap-md" padding="lg">
        {isOwned ? (
          <>
            <Text className="font-nunito-extrabold text-body-lg text-ink-900">
              {pack.title} is ready.
            </Text>
            <Text className="font-nunito-regular text-body-md text-ink-600">
              You can hand the device back to your Explorer when you&apos;re ready.
            </Text>
            <Button label={`Open ${pack.title}`} onPress={onOpenPack} size="large" />
          </>
        ) : purchase.status === 'checking-access' || purchase.status === 'loading-product' ? (
          <View className="flex-row items-center gap-md" accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.ocean500} />
            <Text className="font-nunito-regular text-body-md text-ink-600">
              {purchase.message ?? 'Checking availability…'}
            </Text>
          </View>
        ) : purchase.status === 'purchasing' ? (
          <>
            <View className="flex-row items-center gap-md" accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.ocean500} />
              <Text className="font-nunito-regular text-body-md text-ink-600">
                Completing purchase…
              </Text>
            </View>
            <Button
              label="Completing purchase…"
              onPress={() => undefined}
              disabled
              size="large"
              accessibilityLabel="Purchase in progress"
            />
          </>
        ) : purchase.status === 'pending' ? (
          <>
            <Text className="font-nunito-extrabold text-body-lg text-ink-900">
              Purchase pending
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              className="font-nunito-regular text-body-md text-ink-600"
            >
              {purchase.message}
            </Text>
          </>
        ) : purchase.status === 'unavailable' ? (
          <>
            <Text
              accessibilityLiveRegion="polite"
              className="font-nunito-regular text-body-md text-ink-600"
            >
              {purchase.message}
            </Text>
            {purchase.retryable ? (
              <Button label="Try Again" onPress={() => void purchase.retry()} variant="secondary" />
            ) : null}
          </>
        ) : purchase.status === 'failed' ? (
          <>
            <Text
              accessibilityLiveRegion="polite"
              className="font-nunito-regular text-body-md text-ink-600"
            >
              {purchase.message}
            </Text>
            {purchase.retryable ? (
              <Button label="Try Again" onPress={() => void purchase.retry()} variant="secondary" />
            ) : null}
          </>
        ) : (
          <>
            <Text className="font-nunito-semibold text-body-md text-ink-900">
              One-time purchase · {purchase.product?.localizedPrice}
            </Text>
            {purchase.message ? (
              <Text
                accessibilityLiveRegion="polite"
                className="font-nunito-regular text-body-sm text-ink-600"
              >
                {purchase.message}
              </Text>
            ) : null}
            <Button
              label={`Get ${pack.title}`}
              onPress={() => void purchase.purchase()}
              disabled={!canBuy}
              size="large"
              accessibilityLabel={`Get ${pack.title} with a one-time purchase`}
            />
          </>
        )}
      </Card>
    </View>
  );
}
