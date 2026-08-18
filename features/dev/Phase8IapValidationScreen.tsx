import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { getCommerceDependencies } from '../../application/commerce/commerceRuntime';
import { getPlatformProductId } from '../../commerce/catalogue';
import { parseCommerceKey } from '@app-types/domain/ids';

const commerceKey = parseCommerceKey('space-adventures-one-time');

interface Result {
  name: string;
  error?: string;
}

export function Phase8IapValidationScreen() {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    const run = async () => {
      const next: Result[] = [];
      const scenario = async (name: string, work: () => Promise<void>) => {
        try {
          await work();
          next.push({ name });
        } catch (error) {
          next.push({ name, error: error instanceof Error ? error.message : String(error) });
        }
      };

      await scenario('Android catalogue resolves the planned Google product ID', async () => {
        if (getPlatformProductId(commerceKey, 'android') !== 'pack_space_adventures') {
          throw new Error('Android product mapping changed');
        }
      });
      await scenario('Native IAP lookup is safe with no registered Store product', async () => {
        const result = await getCommerceDependencies().commerce.resolveStoreProduct(commerceKey);
        if (result.state === 'available') throw new Error('Unexpected Store product availability');
      });
      setResults(next);
    };
    void run();
  }, []);

  const passed = results?.filter((result) => !result.error).length ?? 0;
  return (
    <ScrollView className="flex-1 bg-cream px-6 pt-20">
      <Text className="font-fredoka text-3xl text-ink">Phase 8E native IAP validation</Text>
      <Text className="mt-3 font-nunito text-lg text-ink">
        {results ? `${passed}/${results.length} scenarios passed` : 'Running…'}
      </Text>
      {results?.map((result) => (
        <View key={result.name} className="mt-5 rounded-2xl bg-white p-4">
          <Text className="font-nunito text-base text-ink">
            {result.error ? '✗' : '✓'} {result.name}
          </Text>
          {result.error ? <Text className="mt-1 text-red-600">{result.error}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}
