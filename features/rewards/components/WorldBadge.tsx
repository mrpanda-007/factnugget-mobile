import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, elevation, fontFamily, radius, spacing, worldThemes } from '@constants/tokens';
import type { WorldId } from '@constants/tokens';

interface WorldBadgeProps {
  worldId: WorldId;
  worldTitle: string;
  title: string;
  icon: string;
  variant?: 'hero' | 'card';
  statusLabel?: string;
}

export function WorldBadge({
  worldId,
  worldTitle,
  title,
  icon,
  variant = 'card',
  statusLabel = `Completed ${worldTitle}`,
}: WorldBadgeProps) {
  const theme = worldThemes[worldId];
  const hero = variant === 'hero';
  const artworkSize = hero ? 148 : 68;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${title}. ${statusLabel}.`}
      style={[
        elevation.resting,
        {
          flexDirection: hero ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: hero ? 'center' : 'flex-start',
          gap: hero ? spacing.md : spacing.lg,
          borderRadius: radius.xl,
          borderWidth: 2,
          borderColor: theme.secondary,
          padding: hero ? spacing.xl : spacing.lg,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: artworkSize, height: artworkSize * 1.12 }}
      >
        <Svg width={artworkSize} height={artworkSize * 1.12} viewBox="0 0 100 112">
          <Path d="M25 68 L18 110 L50 91 L82 110 L75 68 Z" fill={theme.primary} />
          <Circle
            cx={50}
            cy={47}
            r={42}
            fill={theme.tint}
            stroke={theme.secondary}
            strokeWidth={5}
          />
          <Circle cx={50} cy={47} r={32} fill={theme.primary} />
        </Svg>
        <Text
          style={{
            position: 'absolute',
            top: artworkSize * 0.2,
            left: 0,
            right: 0,
            color: colors.surface,
            fontSize: artworkSize * 0.34,
            textAlign: 'center',
          }}
        >
          {icon}
        </Text>
      </View>

      <View style={{ flex: hero ? undefined : 1, alignItems: hero ? 'center' : 'flex-start' }}>
        <Text
          style={{
            color: theme.primary,
            fontFamily: fontFamily.bodyExtraBold,
            fontSize: hero ? 14 : 12,
            letterSpacing: 0.6,
            textAlign: hero ? 'center' : 'left',
            textTransform: 'uppercase',
          }}
        >
          {statusLabel}
        </Text>
        <Text
          style={{
            marginTop: spacing.xs,
            color: colors.ink900,
            fontFamily: fontFamily.displaySemiBold,
            fontSize: hero ? 25 : 18,
            lineHeight: hero ? 32 : 24,
            textAlign: hero ? 'center' : 'left',
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}
