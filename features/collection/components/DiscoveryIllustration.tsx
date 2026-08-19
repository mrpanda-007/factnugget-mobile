import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@constants/tokens';
import type { ContentImage, Discovery } from '@app-types/domain/content';

interface Props {
  discovery: Pick<Discovery, 'id' | 'title'> & { images: ContentImage[]; fallbackEmoji: string };
  /**
   * A World's themeKey (preferred) or id — see constants/tokens.ts#themeForWorldId.
   * The canonical Discovery is deliberately world-agnostic (it can be reused
   * across Packs/Worlds), so the theme/bespoke-art context that used to live
   * on `discovery.category` must come from the caller's own World/Pack scope.
   */
  worldId: string;
  size: number;
  hidden?: boolean;
}

function OceanObject({ id }: { id: string }) {
  if (id === 'octopus') {
    return (
      <G transform="translate(50 47)">
        <Ellipse rx={22} ry={19} fill={colors.coral500} />
        <Circle cx={-7} cy={-3} r={2.5} fill={colors.ink900} />
        <Circle cx={7} cy={-3} r={2.5} fill={colors.ink900} />
        <Path
          d="M-17 12 C-30 25 -26 39 -18 44 M-6 16 C-15 31 -9 43 0 46 M7 16 C3 31 10 40 19 40 M18 10 C31 21 32 34 25 42"
          fill="none"
          stroke={colors.coral500}
          strokeWidth={8}
          strokeLinecap="round"
        />
      </G>
    );
  }
  if (id === 'blue-whale') {
    return (
      <G transform="translate(49 50)">
        <Path
          d="M-35 5 C-23 -19 19 -22 35 -3 C43 7 37 18 22 23 C-1 31 -25 24 -35 13 Z"
          fill={colors.ocean700}
        />
        <Path
          d="M31 -1 C43 -13 52 -12 58 -2 C49 0 48 8 56 15 C46 17 38 12 33 7 Z"
          fill={colors.ocean700}
        />
        <Circle cx={-24} cy={3} r={2.5} fill={colors.cream} />
      </G>
    );
  }
  if (id === 'shark') {
    return (
      <G transform="translate(50 50)">
        <Path
          d="M-39 7 C-16 -16 21 -16 42 2 L57 -8 L51 13 L57 29 L40 20 C10 35 -23 27 -39 13 Z"
          fill="#668F9B"
        />
        <Path d="M-3 -10 L8 -30 L17 -7" fill="#668F9B" />
        <Circle cx={29} cy={3} r={2.5} fill={colors.ink900} />
      </G>
    );
  }
  return (
    <G transform="translate(50 49)">
      <Path
        d="M-38 8 C-17 -14 16 -17 39 1 C28 6 26 16 39 23 C12 34 -21 27 -38 14 Z"
        fill={colors.ocean500}
      />
      <Path d="M-6 -9 C2 -27 17 -25 22 -9" fill={colors.ocean500} />
      <Circle cx={27} cy={4} r={2.5} fill={colors.ink900} />
    </G>
  );
}

function SpaceObject({ id }: { id: string }) {
  if (id === 'sun') {
    return (
      <G transform="translate(50 50)">
        <Circle r={23} fill={colors.sunshine500} />
        <Path
          d="M0 -42 V-31 M0 31 V42 M-42 0 H-31 M31 0 H42 M-30 -30 L-22 -22 M22 22 L30 30 M30 -30 L22 -22 M-22 22 L-30 30"
          stroke={colors.sunshine700}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </G>
    );
  }
  if (id === 'moon') {
    return (
      <Path
        d="M64 19 C38 24 27 57 44 78 C57 94 82 87 89 68 C69 75 51 58 57 39 C59 31 62 25 64 19 Z"
        fill={colors.sunshine300}
      />
    );
  }
  if (id === 'saturn') {
    return (
      <G transform="translate(50 51) rotate(-12)">
        <Circle r={24} fill={colors.sunshine300} />
        <Ellipse rx={43} ry={12} fill="none" stroke={colors.coral300} strokeWidth={7} />
      </G>
    );
  }
  return (
    <G transform="translate(50 50)">
      <Rect x={-23} y={-9} width={46} height={18} rx={4} fill="#DDE5ED" />
      <Rect x={-42} y={-15} width={16} height={30} fill={colors.ocean500} />
      <Rect x={26} y={-15} width={16} height={30} fill={colors.ocean500} />
      <Path
        d="M0 -9 V-27 M-7 -27 H7"
        stroke={colors.ink600}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </G>
  );
}

export function DiscoveryIllustration({ discovery, worldId, size, hidden = false }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = discovery.images[0]?.url ?? null;
  const background = worldId === 'space' ? colors.cosmic50 : colors.ocean50;

  if (!hidden && imageUrl && !imageFailed) {
    return (
      <View
        accessible={false}
        importantForAccessibility="no"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: background,
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={{ width: size, height: size }}
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  const hasBespokeArt = worldId === 'ocean' || worldId === 'space';

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {hasBespokeArt ? (
        <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden>
          <Circle cx={50} cy={50} r={48} fill={hidden ? colors.sand : background} />
          <G opacity={hidden ? 0.16 : 1}>
            {worldId === 'ocean' ? (
              <OceanObject id={discovery.id} />
            ) : (
              <SpaceObject id={discovery.id} />
            )}
          </G>
          {hidden ? (
            <G>
              <Circle cx={50} cy={50} r={18} fill={colors.surface} opacity={0.9} />
              <Path
                d="M43 43 C44 34 58 34 59 43 C60 50 51 51 51 58"
                fill="none"
                stroke={colors.ink400}
                strokeWidth={6}
                strokeLinecap="round"
              />
              <Circle cx={50} cy={68} r={3} fill={colors.ink400} />
            </G>
          ) : null}
        </Svg>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hidden ? colors.sand : background,
          }}
        >
          <Text style={{ fontSize: size * 0.5, opacity: hidden ? 0.16 : 1 }}>
            {hidden ? '?' : discovery.fallbackEmoji}
          </Text>
        </View>
      )}
    </View>
  );
}
