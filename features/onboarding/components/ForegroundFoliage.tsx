import Svg, { G, Path } from 'react-native-svg';

import { islandScene } from '@constants/tokens';

interface ForegroundFoliageProps {
  width: number;
  height: number;
}

const VIEW_BOX_WIDTH = 300;
const VIEW_BOX_HEIGHT = 200;

/**
 * One curved leaf, drawn from its stem at the origin and leaning left. Fanned
 * with different rotations and scales it makes every cluster below; a single
 * shape kept consistent reads as one plant, where a pile of distinct silhouettes
 * reads as clip art.
 */
const LEAF = 'M0 0 C -20 -12, -30 -38, -18 -60 C 4 -50, 18 -24, 10 0 Z';

interface LeafClusterProps {
  x: number;
  /** Negative mirrors the cluster for the opposite corner. */
  scale: number;
}

function LeafCluster({ x, scale }: LeafClusterProps) {
  return (
    <G transform={`translate(${x} 212) scale(${scale} ${Math.abs(scale)})`}>
      <Path
        d={LEAF}
        transform="rotate(-26) scale(1.3)"
        fill={islandScene.grassDeep}
        opacity={0.9}
      />
      <Path d={LEAF} transform="rotate(4) scale(1.1)" fill={islandScene.grassDark} opacity={0.92} />
      <Path
        d={LEAF}
        transform="rotate(32) scale(0.86)"
        fill={islandScene.grassDeep}
        opacity={0.8}
      />
    </G>
  );
}

/**
 * Layer 4 — the near band that sells the depth.
 *
 * Only the corners are planted and nothing rises much above a third of the
 * band: the centre stays clear so the CTA never has to fight a silhouette for
 * contrast, while the cropped clusters at the frame edges still read as a
 * continuous foreground. This layer travels and grows the most during the
 * push-in, which is what makes the camera feel like it moved rather than
 * zoomed.
 */
export function ForegroundFoliage({ width, height }: ForegroundFoliageProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      pointerEvents="none"
    >
      {/* Soft ground swell the clusters grow out of, so nothing looks pasted on. */}
      <Path
        d="M0 200 L0 178 C 54 162, 108 176, 162 168 C 214 160, 258 148, 300 158 L300 200 Z"
        fill={islandScene.grassDeep}
        opacity={0.14}
      />
      <Path
        d="M0 200 L0 190 C 62 180, 132 192, 196 186 C 240 182, 272 176, 300 180 L300 200 Z"
        fill={islandScene.grassDark}
        opacity={0.18}
      />

      {/* Tucked into the corners: on a short phone the CTA sits low, and a
          cluster any further inboard puts a leaf tip across the button. */}
      <LeafCluster x={26} scale={1.08} />
      <LeafCluster x={280} scale={-1.18} />

      {/* Two low tufts to break the gap between the corners. */}
      <Path
        d={LEAF}
        fill={islandScene.grassDark}
        opacity={0.45}
        transform="translate(104 208) rotate(-12) scale(0.5)"
      />
      <Path
        d={LEAF}
        fill={islandScene.grassDeep}
        opacity={0.4}
        transform="translate(210 206) rotate(14) scale(0.44)"
      />
    </Svg>
  );
}
