import { Text, View } from 'react-native';

import { Button } from '@components/Button';
import { useRemoteExplorerImport } from '@features/parent/hooks/useRemoteExplorerImport';

/** Parent-only recovery picker. Explorer UUID is preserved but shortened only for non-identifying UI context. */
export function RemoteExplorerImportSection() {
  const remote = useRemoteExplorerImport();
  return (
    <View className="gap-sm">
      <Button
        label="Add an Explorer from this account"
        onPress={() => void remote.load()}
        disabled={remote.active}
        variant="secondary"
      />
      {remote.message ? (
        <Text
          accessibilityLiveRegion="polite"
          className="font-nunito-regular text-body-sm text-ink-600"
        >
          {remote.message}
        </Text>
      ) : null}
      {remote.status === 'remoteExplorersAvailable'
        ? remote.explorers.map((explorer) => (
            <Button
              key={explorer.explorerId}
              label={`Add Explorer ${explorer.explorerId.slice(0, 8)}`}
              onPress={() => void remote.importExplorer(explorer.explorerId)}
              disabled={remote.active}
              variant="secondary"
              accessibilityLabel={`Add Explorer ${explorer.explorerId.slice(0, 8)} to this device`}
            />
          ))
        : null}
      {remote.status === 'importComplete' ? (
        <Button
          label="Use this Explorer on this device"
          onPress={() => void remote.makeActive()}
          disabled={remote.active}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}
