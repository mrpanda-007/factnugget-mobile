import { ScrollView, Text, TextInput } from 'react-native';
import { useEffect, useState } from 'react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { useBackupAndSync } from '@features/parent/hooks/useBackupAndSync';
import {
  getCloudAccountBindingRepository,
  getSyncOutboxRepository,
} from '../../application/sync/localSyncQueueRuntime';

/** Development-only emulator harness. It uses the normal callable/bootstrap path; no write bypass exists. */
export function Phase9BackupValidationScreen() {
  const backup = useBackupAndSync();
  const [email, setEmail] = useState('phase9-parent@example.test');
  const [password, setPassword] = useState('backup-test-password');
  const [localState, setLocalState] = useState('Loading local binding…');

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const binding = await getCloudAccountBindingRepository().getCurrentBinding();
      const pending =
        binding.state === 'bound'
          ? await getSyncOutboxRepository().countPending(binding.familyId)
          : 0;
      if (!disposed) {
        setLocalState(
          binding.state === 'bound'
            ? `Family ID: ${binding.familyId}\nPending rows: ${pending}`
            : 'No local Family binding',
        );
      }
    })();
    return () => {
      disposed = true;
    };
  }, [backup.status]);

  return (
    <ScrollView className="flex-1 bg-cream p-6">
      <Text className="mb-2 font-fredoka-bold text-display-lg text-ink-900">
        Phase 9F Backup validation
      </Text>
      <Text className="mb-4 font-nunito-regular text-body-sm text-ink-600">
        Emulator-only. This uses the same Firebase Auth, callable Family bootstrap, SQLite binding,
        and sync path as the parent UI.
      </Text>
      <Card className="gap-md" padding="lg">
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          accessibilityLabel="Validation parent email"
          className="rounded-md border-2 border-ocean-100 bg-cream px-md py-sm text-ink-900"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Validation parent password"
          className="rounded-md border-2 border-ocean-100 bg-cream px-md py-sm text-ink-900"
        />
        <Text
          accessibilityLiveRegion="polite"
          className="font-nunito-regular text-body-sm text-ink-600"
        >
          {backup.status}: {backup.message}
        </Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">{localState}</Text>
        <Button
          label="Create emulator parent & set up backup"
          onPress={() => void backup.createAccount(email, password)}
          disabled={backup.operationActive}
        />
        <Button
          label="Sign in"
          onPress={() => void backup.signIn(email, password)}
          disabled={backup.operationActive}
          variant="secondary"
        />
        <Button
          label="Add this device after existing Family detection"
          onPress={() => void backup.addThisDevice()}
          disabled={backup.operationActive}
          variant="secondary"
        />
        <Button
          label="Keep device local"
          onPress={() => backup.keepLocal()}
          disabled={backup.operationActive}
          variant="secondary"
        />
        <Button
          label="Sync"
          onPress={() => void backup.syncNow()}
          disabled={backup.operationActive}
          variant="secondary"
        />
        <Button
          label="Sign out"
          onPress={() => void backup.signOut()}
          disabled={backup.operationActive}
          variant="secondary"
        />
      </Card>
    </ScrollView>
  );
}
