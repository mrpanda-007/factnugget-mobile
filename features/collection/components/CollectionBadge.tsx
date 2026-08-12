import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, elevation, fontFamily, radius, spacing } from '@constants/tokens';

export function CollectionBadge({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`Earned: ${label}`}
      style={[
        elevation.resting,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          padding: spacing.md,
        },
      ]}
    >
      <Svg width={58} height={66} viewBox="0 0 58 66" accessibilityElementsHidden>
        <Path d="M13 38 L9 64 L29 53 L49 64 L45 38 Z" fill={colors.coral500} />
        <Circle
          cx={29}
          cy={28}
          r={25}
          fill={colors.sunshine500}
          stroke={colors.sunshine700}
          strokeWidth={3}
        />
        <Path
          d="M29 12 L34 22 L45 24 L37 32 L39 43 L29 38 L19 43 L21 32 L13 24 L24 22 Z"
          fill={colors.surface}
        />
      </Svg>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.sunshine700,
            fontFamily: fontFamily.bodyExtraBold,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          World complete
        </Text>
        <Text
          style={{ color: colors.ink900, fontFamily: fontFamily.displaySemiBold, fontSize: 17 }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
