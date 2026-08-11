import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { islandScene } from '@constants/tokens';

interface SkyBackdropProps {
  width: number;
  height: number;
}

/**
 * Layer 1 of the first-open scene — the far sky field.
 *
 * It carries no parallax: at "infinite" distance a camera push-in produces no
 * apparent movement, and any scaling here would only reveal edges. The only
 * depth cue is the vertical wash from powder blue down into parchment, which
 * reads as atmospheric haze at the horizon and lets the island sit *in* the
 * sky rather than on top of a flat colour block.
 */
export function SkyBackdrop({ width, height }: SkyBackdropProps) {
  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id="discoverySky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={islandScene.sky} />
          <Stop offset="0.42" stopColor={islandScene.skyMid} />
          <Stop offset="0.72" stopColor={islandScene.skyLight} />
          <Stop offset="1" stopColor={islandScene.paper} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#discoverySky)" />
    </Svg>
  );
}
