import { ScrollView, Text } from 'react-native';
import { useEffect, useState } from 'react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { RemoteExplorerImportSection } from '@features/parent/components/RemoteExplorerImportSection';
import { getBackupSetupService } from '../../application/sync/backupSetupRuntime';
import {
  getCloudAccountBindingRepository,
  getSyncOutboxRepository,
} from '../../application/sync/localSyncQueueRuntime';
import { getParentAccountService } from '../../application/sync/parentAccountRuntime';

async function loadAccountDiagnostics(): Promise<string> {
  const [session, binding, explorerIds] = await Promise.all([
    getParentAccountService().getSession(),
    getCloudAccountBindingRepository().getCurrentBinding(),
    getBackupSetupService().listLocalExplorerIds(),
  ]);
  const pending =
    binding.state === 'bound' ? await getSyncOutboxRepository().countPending(binding.familyId) : 0;

  return `Auth UID: ${session?.authUserId ?? 'none'}\nFamily: ${binding.state === 'bound' ? binding.familyId : 'unbound'}\nPending current Family rows: ${pending}\nLocal Explorer IDs: ${explorerIds.join(', ') || 'none'}`;
}

/** Dev-only recovery diagnostics. It only composes normal client services and never bypasses Rules. */
export function Phase9MultiDeviceValidationScreen() {
  const [status, setStatus] = useState('Loading account diagnostics…');
  const refresh = async () => {
    setStatus(await loadAccountDiagnostics());
  };
  useEffect(() => {
    let disposed = false;
    void loadAccountDiagnostics().then((nextStatus) => {
      if (!disposed) setStatus(nextStatus);
    });
    return () => {
      disposed = true;
    };
  }, []);
  const sync = async () => {
    const ids = await getBackupSetupService().listLocalExplorerIds();
    await getBackupSetupService().syncSeeded(ids);
    await refresh();
  };
  return (
    <ScrollView className="flex-1 bg-cream p-6">
      <Text className="mb-3 font-fredoka-bold text-display-lg text-ink-900">
        Phase 9G multi-device validation
      </Text>
      <Text className="mb-4 font-nunito-regular text-body-sm text-ink-600">
        Development-only. Use a second isolated app data profile for the other logical device; all
        actions use normal Auth, Rules, import, and sync paths.
      </Text>
      <Card className="gap-md" padding="lg">
        <Text
          accessibilityLiveRegion="polite"
          className="font-nunito-regular text-body-sm text-ink-600"
        >
          {status}
        </Text>
        <Button label="Refresh diagnostics" onPress={() => void refresh()} variant="secondary" />
        <Button
          label="Sync current local Explorers"
          onPress={() => void sync()}
          variant="secondary"
        />
        <RemoteExplorerImportSection />
      </Card>
    </ScrollView>
  );
}
