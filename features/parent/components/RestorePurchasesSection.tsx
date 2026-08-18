import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { colors } from '@constants/tokens';
import { useRestorePurchases } from '@features/parent/hooks/useRestorePurchases';
import type { RestorePurchasesDependencies } from '@features/parent/hooks/restorePurchasesModel';

interface RestorePurchasesSectionProps {
  onRestored: () => void;
  dependencies?: RestorePurchasesDependencies;
}

/** A compact, parent-gated maintenance action; it never writes entitlements itself. */
export function RestorePurchasesSection({
  onRestored,
  dependencies,
}: RestorePurchasesSectionProps) {
  const restore = useRestorePurchases(dependencies);
  const restoring = restore.status === 'restoring';

  const handleRestore = async () => {
    const result = await restore.restore();
    if (result.status === 'restored') onRestored();
  };

  return (
    <View className="gap-md">
      <Text
        accessibilityRole="header"
        className="font-fredoka-semibold text-display-md text-ink-900"
      >
        Purchases
      </Text>
      <Card className="gap-md" padding="lg">
        <Text className="font-nunito-semibold text-body-md text-ink-900">Restore Purchases</Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">
          Restore eligible purchases from this device&apos;s app store account. This does not
          restore Discoveries or progress.
        </Text>
        {restoring ? (
          <View className="flex-row items-center gap-md" accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.ocean500} />
            <Text className="font-nunito-regular text-body-md text-ink-600">{restore.message}</Text>
          </View>
        ) : null}
        {restore.message && !restoring ? (
          <Text
            accessibilityLiveRegion="polite"
            className="font-nunito-regular text-body-sm text-ink-600"
          >
            {restore.message}
          </Text>
        ) : null}
        <Button
          label={restoring ? 'Checking previous purchases…' : 'Restore Purchases'}
          onPress={() => void handleRestore()}
          disabled={restoring}
          variant={restore.status === 'failed' && restore.retryable ? 'secondary' : 'primary'}
          accessibilityLabel={restoring ? 'Checking previous purchases' : 'Restore Purchases'}
        />
      </Card>
    </View>
  );
}
