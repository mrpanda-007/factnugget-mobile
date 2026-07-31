import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, elevation } from '@constants/tokens';
import type { Discovery } from '@app-types/Discovery';

interface StickerProps {
  discovery: Pick<Discovery, 'id' | 'title' | 'stickerReward'>;
  /** Unearned renders as a muted silhouette — visible but not yet "mine". */
  earned: boolean;
  size?: number;
}

/** docs/design/02-component-architecture.md#sticker */
export function Sticker({ discovery, earned, size = 88 }: StickerProps) {
  const { icon, label } = discovery.stickerReward;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={earned ? label : `${label} — not yet earned`}
      style={[elevation.resting, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {earned ? (
        <LinearGradient
          colors={[colors.sunshine300, colors.sunshine700]}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.48 }}>{icon}</Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.sand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.48, opacity: 0.35 }}>{icon}</Text>
        </View>
      )}
    </View>
  );
}
