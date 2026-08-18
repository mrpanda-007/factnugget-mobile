import { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';

import { getActiveExplorerState } from '@repositories/ExplorerRepository';
import { getCloudSyncService } from '../../application/sync/cloudSyncRuntime';
import { getParentAccountService } from '../../application/sync/parentAccountRuntime';
import {
  getCloudAccountBindingRepository,
  getSyncOutboxRepository,
} from '../../application/sync/localSyncQueueRuntime';
import type { CloudSyncResult } from '@app-types/domain/cloud';
import type { ExplorerId } from '@app-types/domain/ids';

interface SyncDiagnostics {
  explorerId: ExplorerId | null;
  status: string;
}

async function loadSyncDiagnostics(): Promise<SyncDiagnostics> {
  const [session, binding, active] = await Promise.all([
    getParentAccountService().getSession(),
    getCloudAccountBindingRepository().getCurrentBinding(),
    getActiveExplorerState(),
  ]);
  const pending =
    binding.state === 'bound' ? await getSyncOutboxRepository().countPending(binding.familyId) : 0;

  return {
    explorerId: active.explorer?.id ?? null,
    status: `Auth: ${session ? 'present' : 'none'}\nBinding: ${binding.state}\nActive Explorer: ${active.explorer?.id ?? 'none'}\nPending current-family rows: ${pending}`,
  };
}

export function Phase9FirestoreValidationScreen() {
  const [status, setStatus] = useState('Loading local sync diagnostics…');
  const [result, setResult] = useState<CloudSyncResult | null>(null);

  const refresh = async () => {
    const diagnostics = await loadSyncDiagnostics();
    setStatus(diagnostics.status);
    return diagnostics.explorerId;
  };

  useEffect(() => {
    let disposed = false;
    void loadSyncDiagnostics().then((diagnostics) => {
      if (!disposed) setStatus(diagnostics.status);
    });
    return () => {
      disposed = true;
    };
  }, []);

  const syncNow = async () => {
    const explorerId = await refresh();
    if (!explorerId) return;
    const next = await getCloudSyncService().syncNow(explorerId);
    setResult(next);
    await refresh();
  };

  return (
    <ScrollView className="flex-1 bg-cream p-6">
      <Text className="mb-4 text-2xl font-bold text-ink">
        Phase 9E Firestore transport validation
      </Text>
      <View className="mb-4 rounded-xl bg-white p-4">
        <Text className="text-ink">{status}</Text>
      </View>
      <Button title="Sync active Explorer now" onPress={() => void syncNow()} />
      {result ? <Text className="mt-4 text-ink">{JSON.stringify(result)}</Text> : null}
      <Text className="mt-6 text-sm text-ink">
        Development only. It exposes no tokens, email, or child PII.
      </Text>
    </ScrollView>
  );
}
