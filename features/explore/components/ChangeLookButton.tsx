import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@components/Avatar';
import { explorerIdentityOptions } from '@constants/explorerIdentities';
import { colors, elevation } from '@constants/tokens';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';

interface ChangeLookButtonProps {
  identity: ExplorerIdentityId;
  onPress: () => void;
  size?: number;
}

/**
 * The Explore header avatar, turned into the entry point for re-picking a
 * look. Wraps Avatar rather than extending it so the plain decorative avatars
 * inside ExplorerLookPicker's cards stay badge-free.
 */
export function ChangeLookButton({ identity, onPress, size = 52 }: ChangeLookButtonProps) {
  const option = explorerIdentityOptions.find((candidate) => candidate.id === identity);
  const badgeSize = Math.round(size * 0.42);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change your explorer look. Currently ${option?.label ?? 'Explorer'}.`}
      accessibilityHint="Opens the explorer look picker"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        opacity: pressed ? 0.86 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      {/* The button already announces the look, so Avatar's own image role would just be a second, noisier node. */}
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <Avatar identity={identity} size={size} />
      </View>
      <View
        style={[
          elevation.resting,
          {
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.sand,
          },
        ]}
      >
        <Text style={{ fontSize: badgeSize * 0.55 }}>✏️</Text>
      </View>
    </Pressable>
  );
}
