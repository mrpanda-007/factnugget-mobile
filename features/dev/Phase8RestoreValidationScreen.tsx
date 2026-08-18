import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { getCommerceDependencies } from '../../application/commerce/commerceRuntime';
import type { CommerceReconciliationResult } from '../../application/commerce/CommerceService';
import { Button } from '@components/Button';
import { RestorePurchasesSection } from '@features/parent/components/RestorePurchasesSection';
import type { RestorePurchasesDependencies } from '@features/parent/hooks/restorePurchasesModel';

type Scenario = 'owned' | 'none' | 'failure' | 'unknown' | 'interrupted' | 'partial';

const labels: Record<Scenario, string> = {
  owned: 'Restore owned Space',
  none: 'Restore none',
  failure: 'Restore failure',
  unknown: 'Restore unknown product',
  interrupted: 'Recover interrupted purchase',
  partial: 'Partial restore',
};

function resultFor(scenario: Scenario): CommerceReconciliationResult {
  switch (scenario) {
    case 'owned':
    case 'interrupted':
      return {
        state: 'restored',
        restoredCommerceKeys: ['space-adventures-one-time' as never],
        unchangedCommerceKeys: [],
        unknownProductIds: [],
        failedCommerceKeys: [],
      };
    case 'none':
      return { state: 'nothing-found', unknownProductIds: [] };
    case 'failure':
      return { state: 'unavailable', retryable: true };
    case 'unknown':
      return { state: 'nothing-found', unknownProductIds: ['legacy_unknown_pack'] };
    case 'partial':
      return {
        state: 'failed',
        restoredCommerceKeys: ['space-adventures-one-time' as never],
        unchangedCommerceKeys: [],
        unknownProductIds: ['legacy_unknown_pack'],
        failedCommerceKeys: [],
      };
  }
}

function createFakeDependencies(scenario: Scenario): RestorePurchasesDependencies {
  return { commerce: { restoreEntitlements: async () => resultFor(scenario) } };
}

/** Development-only visual validation for parent Restore Purchases states. */
export function Phase8RestoreValidationScreen() {
  return __DEV__ ? <Phase8RestoreValidationContent /> : null;
}

function Phase8RestoreValidationContent() {
  const [scenario, setScenario] = useState<Scenario>('owned');
  const [refreshed, setRefreshed] = useState(false);
  const dependencies = useMemo(() => createFakeDependencies(scenario), [scenario]);

  return (
    <ScrollView className="flex-1 bg-cream px-6 pt-20">
      <Text className="font-fredoka text-3xl text-ink">Phase 8G restore validation</Text>
      <Text className="mt-3 font-nunito text-lg text-ink">
        Development-only fake reconciliation. It never changes production entitlements.
      </Text>
      <View className="mt-6 gap-3">
        {(Object.keys(labels) as Scenario[]).map((key) => (
          <Button
            key={key}
            label={labels[key]}
            variant={scenario === key ? 'primary' : 'secondary'}
            onPress={() => {
              setScenario(key);
              setRefreshed(false);
            }}
          />
        ))}
      </View>
      <View className="mt-8">
        <RestorePurchasesSection
          key={scenario}
          dependencies={dependencies}
          onRestored={() => setRefreshed(true)}
        />
      </View>
      {refreshed ? (
        <Text className="mt-4 font-nunito text-base text-ink-600">
          Parent access refresh was requested for this development scenario.
        </Text>
      ) : null}
      <RealRestoreCheck />
    </ScrollView>
  );
}

function RealRestoreCheck() {
  const [message, setMessage] = useState('Check the real provider safely on this device.');
  const check = async () => {
    const result = await getCommerceDependencies().commerce.restoreEntitlements();
    setMessage(
      result.state === 'restored'
        ? 'The real provider restored current ownership.'
        : result.state === 'nothing-found'
          ? 'The real provider found no previous purchases.'
          : 'The real provider is unavailable right now; cached access is unchanged.',
    );
  };
  return (
    <View className="mt-8 gap-3 rounded-2xl bg-white p-4">
      <Text className="font-fredoka text-xl text-ink">Real provider restore check</Text>
      <Text className="font-nunito text-base text-ink-600">{message}</Text>
      <Button label="Check Real Restore" variant="secondary" onPress={() => void check()} />
    </View>
  );
}
