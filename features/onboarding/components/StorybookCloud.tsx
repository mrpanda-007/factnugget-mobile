import Svg, { Path } from 'react-native-svg';

import { islandScene } from '@constants/tokens';

/** Aspect ratio of every cloud path below — callers size by width alone. */
export const CLOUD_ASPECT = 46 / 120;

/**
 * Three hand-drawn silhouettes rather than one reused shape: repeating a
 * single blob across the sky reads as a UI pattern, and the whole point of
 * this layer is that it looks painted. Each is lumpier on one side than the
 * other so nothing looks like a mirrored primitive.
 */
const cloudPaths = [
  'M16 44 C 4 44, 0 33, 10 27 C 8 14, 22 6, 34 12 C 42 0, 66 0, 73 12 C 88 7, 102 15, 100 27 C 114 29, 116 44, 100 44 Z',
  'M20 44 C 6 44, 2 34, 12 28 C 12 16, 28 9, 40 16 C 50 4, 72 6, 78 18 C 94 16, 106 26, 100 36 C 110 40, 108 44, 94 44 Z',
  'M14 44 C 2 43, 0 32, 12 28 C 10 15, 26 8, 38 15 C 48 2, 70 3, 76 16 C 90 14, 100 24, 96 34 C 106 38, 104 44, 88 44 Z',
];

interface StorybookCloudProps {
  width: number;
  /** Picks one of the three silhouettes; wraps, so callers can pass an index. */
  variant?: number;
  opacity?: number;
}

export function StorybookCloud({ width, variant = 0, opacity = 1 }: StorybookCloudProps) {
  return (
    <Svg
      width={width}
      height={width * CLOUD_ASPECT}
      viewBox="0 0 120 46"
      opacity={opacity}
      pointerEvents="none"
    >
      <Path d={cloudPaths[variant % cloudPaths.length]} fill={islandScene.cloud} />
    </Svg>
  );
}
