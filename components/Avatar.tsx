import { View } from 'react-native';

import { IllustrationStage } from '@components/IllustrationStage';
import { explorerIdentityOptions, identityWorldId } from '@constants/explorerIdentities';
import { worldThemes } from '@constants/tokens';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';

interface AvatarProps {
  identity: ExplorerIdentityId;
  size?: number;
}

/** docs/design/02-component-architecture.md#avatar */
export function Avatar({ identity, size = 64 }: AvatarProps) {
  const option = explorerIdentityOptions.find((candidate) => candidate.id === identity);
  const theme = worldThemes[identityWorldId[identity]];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={option?.label ?? 'Explorer avatar'}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <IllustrationStage emoji={option?.emoji ?? '⭐'} theme={theme} size={size} shape="circle" />
    </View>
  );
}
