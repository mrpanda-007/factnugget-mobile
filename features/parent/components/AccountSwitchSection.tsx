import { Text, View } from 'react-native';

import { Button } from '@components/Button';
import { useAccountSwitch } from '@features/parent/hooks/useAccountSwitch';

interface AccountSwitchSectionProps {
  onSwitched: (mode: 'connect' | 'addLocal' | 'import') => void;
}

/** Explicit confirmation after a wrong-account sign-in; no sign-in alone can change the local binding. */
export function AccountSwitchSection({ onSwitched }: AccountSwitchSectionProps) {
  const switcher = useAccountSwitch();
  if (switcher.status === 'idle')
    return (
      <Button
        label="Switch parent account"
        onPress={() => switcher.confirmIntent()}
        variant="secondary"
      />
    );
  return (
    <View className="gap-sm">
      <Text
        accessibilityLiveRegion="polite"
        className="font-nunito-regular text-body-sm text-ink-600"
      >
        {switcher.message}
      </Text>
      {switcher.status === 'switchConfirm' ? (
        <Button
          label="Check this signed-in account"
          onPress={() => void switcher.prepare()}
          disabled={switcher.active}
          variant="secondary"
        />
      ) : null}
      {switcher.status === 'switchPendingOldChanges' ? (
        <Button
          label="Switch anyway"
          onPress={() =>
            void switcher.finalize().then((result) => {
              if (result.status === 'switchComplete') onSwitched('connect');
            })
          }
          disabled={switcher.active}
          variant="secondary"
        />
      ) : null}
      {switcher.status === 'switchChooseLocalHandling' && !switcher.targetFamilyId ? (
        <Button
          label="Set up Backup & Sync for this account"
          onPress={() => void switcher.createTargetFamily()}
          disabled={switcher.active}
          variant="secondary"
        />
      ) : null}
      {switcher.status === 'switchChooseLocalHandling' && switcher.targetFamilyId ? (
        <>
          <Button
            label="Connect without uploading current Explorers"
            onPress={() =>
              void switcher.finalize().then((result) => {
                if (result.status === 'switchComplete') onSwitched('connect');
              })
            }
            disabled={switcher.active}
            variant="secondary"
          />
          <Button
            label="Connect and add this device’s Explorers"
            onPress={() =>
              void switcher.finalize().then((result) => {
                if (result.status === 'switchComplete') onSwitched('addLocal');
              })
            }
            disabled={switcher.active}
          />
          <Button
            label="Connect and add an Explorer from this account"
            onPress={() =>
              void switcher.finalize().then((result) => {
                if (result.status === 'switchComplete') onSwitched('import');
              })
            }
            disabled={switcher.active}
            variant="secondary"
          />
        </>
      ) : null}
    </View>
  );
}
