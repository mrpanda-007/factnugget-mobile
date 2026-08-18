import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { getCommerceDependencies } from '../../application/commerce/commerceRuntime';
import { Button } from '@components/Button';
import { PackPurchaseSection } from '@features/parent/components/PackPurchaseSection';
import type { PackPurchaseDependencies } from '@features/parent/hooks/packPurchaseModel';
import type { PurchaseResult, StoreProductLookupResult } from '@app-types/domain/commerce';
import type { LearningPack } from '@app-types/domain/content';
import {
  parseCommerceKey,
  parseContentSlug,
  parseLearningPackId,
  parsePlatformProductId,
  parseWorldId,
} from '@app-types/domain/ids';

type Scenario =
  | 'available'
  | 'success'
  | 'cancelled'
  | 'pending'
  | 'failed'
  | 'already-owned'
  | 'unavailable'
  | 'owned-offline';

const commerceKey = parseCommerceKey('space-adventures-one-time');
const pack: LearningPack = {
  id: parseLearningPackId('space-adventures'),
  slug: parseContentSlug('space-adventures'),
  worldId: parseWorldId('space'),
  title: 'Space Adventures',
  subtitle: 'A journey through space',
  sortOrder: 1,
  accessType: 'paid',
  commerceKey,
  completionRole: 'required',
  lifecycle: 'published',
  revision: '1',
};

const testProduct: StoreProductLookupResult = {
  state: 'available',
  products: [
    {
      commerceKey,
      platformProductId: parsePlatformProductId('test.pack.space_adventures'),
      localizedPrice: 'Test Price',
      currencyCode: 'TEST',
      title: 'Space Adventures',
      description: 'Development-only test product',
    },
  ],
};

const labels: Record<Scenario, string> = {
  available: 'Product available',
  success: 'Purchase success',
  cancelled: 'Cancelled',
  pending: 'Pending',
  failed: 'Failed',
  'already-owned': 'Already owned',
  unavailable: 'Product unavailable',
  'owned-offline': 'Owned + unavailable',
};

function createFakeDependencies(scenario: Scenario): PackPurchaseDependencies {
  let entitled = scenario === 'owned-offline';
  const result: PurchaseResult =
    scenario === 'success'
      ? { state: 'success', commerceKey }
      : scenario === 'cancelled'
        ? { state: 'cancelled' }
        : scenario === 'pending'
          ? { state: 'pending', commerceKey }
          : scenario === 'failed'
            ? {
                state: 'failed',
                message: 'Test Store unavailable',
                code: 'store-unavailable',
                retryable: true,
              }
            : scenario === 'already-owned'
              ? { state: 'already-owned', commerceKey }
              : { state: 'cancelled' };
  return {
    access: {
      getLearningPackAccess: async () =>
        entitled
          ? {
              state: 'allowed',
              decision: {
                state: 'accessible',
                reason: 'entitled',
                contentAvailability: 'available',
              },
            }
          : { state: 'locked', decision: { state: 'locked', reason: 'not-entitled' } },
    },
    commerce: {
      resolveStoreProduct: async () =>
        scenario === 'unavailable' || scenario === 'owned-offline'
          ? { state: 'unavailable', code: 'store-unavailable', retryable: true }
          : testProduct,
      purchase: async () => {
        if (result.state === 'success' || result.state === 'already-owned') entitled = true;
        return result;
      },
    },
  };
}

/** Development-only visual validation for every parent purchase UX state. */
export function Phase8PurchaseValidationScreen() {
  return __DEV__ ? <Phase8PurchaseValidationContent /> : null;
}

function Phase8PurchaseValidationContent() {
  const [scenario, setScenario] = useState<Scenario>('available');
  const [opened, setOpened] = useState(false);
  const dependencies = useMemo(() => createFakeDependencies(scenario), [scenario]);

  return (
    <ScrollView className="flex-1 bg-cream px-6 pt-20">
      <Text className="font-fredoka text-3xl text-ink">Phase 8F parent purchase UX</Text>
      <Text className="mt-3 font-nunito text-lg text-ink">
        Development-only fake provider. Pick a scenario, then use the parent purchase controls
        below.
      </Text>
      <View className="mt-6 gap-3">
        {(Object.keys(labels) as Scenario[]).map((key) => (
          <Button
            key={key}
            label={labels[key]}
            variant={scenario === key ? 'primary' : 'secondary'}
            onPress={() => {
              setOpened(false);
              setScenario(key);
            }}
          />
        ))}
      </View>
      <View className="mt-8">
        <PackPurchaseSection
          key={scenario}
          pack={pack}
          dependencies={dependencies}
          onOpenPack={() => setOpened(true)}
        />
      </View>
      {opened ? (
        <Text className="mt-4 font-nunito text-base text-ink-600">
          Open action received for this development-only scenario.
        </Text>
      ) : null}
      <RealProviderCheck />
    </ScrollView>
  );
}

function RealProviderCheck() {
  const [result, setResult] = useState<string>('Checking the real provider…');
  const check = async () => {
    const lookup = await getCommerceDependencies().commerce.resolveStoreProduct(commerceKey);
    setResult(
      lookup.state === 'available'
        ? 'Real provider returned an available product.'
        : 'Real provider safely reports this product is unavailable on this device.',
    );
  };

  return (
    <View className="mt-8 gap-3 rounded-2xl bg-white p-4">
      <Text className="font-fredoka text-xl text-ink">Real provider check</Text>
      <Text className="font-nunito text-base text-ink-600">{result}</Text>
      <Button label="Check Real Provider" variant="secondary" onPress={() => void check()} />
    </View>
  );
}
