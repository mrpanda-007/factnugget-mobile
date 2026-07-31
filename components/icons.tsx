import Svg, { Path } from 'react-native-svg';

import { colors } from '@constants/tokens';

/**
 * Hand-coded chrome icon set — docs/design/04-asset-strategy.md#iconography-emoji-first.
 * World/subject iconography stays emoji; this small set covers the UI chrome
 * emoji can't (back, close, check, sound toggle).
 */
interface IconProps {
  size?: number;
  color?: string;
}

export function ChevronIcon({ size = 24, color = colors.ink900 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5L8 12L15 19"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color = colors.ink900 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = colors.ink900 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13L9.5 17.5L19 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface SpeakerIconProps extends IconProps {
  muted?: boolean;
}

export function SpeakerIcon({ size = 24, color = colors.ink900, muted = false }: SpeakerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9V15H7L12 19V5L7 9H4Z" fill={color} />
      {muted ? (
        <Path d="M16 9L20 15M20 9L16 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      ) : (
        <Path
          d="M15.5 9C16.5 10.2 16.5 13.8 15.5 15"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Svg>
  );
}
