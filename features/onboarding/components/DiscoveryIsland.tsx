import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

import { islandScene } from '@constants/tokens';

const VIEW_BOX_WIDTH = 300;
const VIEW_BOX_HEIGHT = 230;

/**
 * The island body is authored around y=26..154 and then pushed down by this
 * much, so the trees have headroom to break above the silhouette without
 * clipping at the top of the viewBox.
 */
const BODY_OFFSET_Y = 60;

/** Rendered height = width * ISLAND_ASPECT. */
export const ISLAND_ASPECT = VIEW_BOX_HEIGHT / VIEW_BOX_WIDTH;

/**
 * Where a character standing on the near grass slope has its feet, as a
 * fraction of the rendered size. The scene plants Ollie from these instead of
 * guessing at pixel offsets, so retuning the island art can't silently leave
 * him floating.
 */
export const ISLAND_GROUND_Y = (BODY_OFFSET_Y + 40) / VIEW_BOX_HEIGHT;
export const ISLAND_GROUND_X = 0.62;

// Deliberately irregular: every curve control point is nudged off its mirror
// so the silhouette reads as drawn rather than as a stack of ellipses.
const GRASS_PATH =
  'M14 84 C 26 58, 58 42, 98 38 C 132 34, 152 26, 190 32 C 236 39, 276 56, 286 84 ' +
  'C 258 100, 208 110, 150 110 C 92 110, 42 100, 14 84 Z';

const GRASS_SHADE_PATH =
  'M14 84 C 42 100, 92 110, 150 110 C 208 110, 258 100, 286 84 ' +
  'C 276 93, 254 102, 226 108 C 190 116, 138 117, 102 111 C 66 105, 34 96, 14 84 Z';

// Shallower and heavier on the left than the right — a symmetric underside
// reads as a bowl, which is the one shape that kills the "floating rock" idea.
const EARTH_PATH =
  'M14 84 C 42 100, 92 110, 150 110 C 208 110, 258 100, 286 84 ' +
  'C 278 104, 256 122, 220 136 C 194 146, 168 154, 154 147 ' +
  // Stays low until it is nearly at the left edge: curving up early leaves a
  // long thin wedge of sand hugging the grass seam, which reads as a stray line.
  'C 134 137, 104 130, 78 116 C 56 106, 30 98, 14 84 Z';

// Kept well inside the earth silhouette. The sand tapers to nothing at both
// tips, so a seam that starts near the left edge pokes out of the fill and
// reads as a stray line under the island rather than as a strata mark.
const EARTH_SEAM_PATH = 'M110 118 C 136 133, 170 140, 200 131 C 214 127, 226 123, 232 119';

interface TreeProps {
  x: number;
  y: number;
  scale?: number;
  canopy: string;
}

/** Origin sits at the trunk's base, so trees are placed by their footprint. */
function Tree({ x, y, scale = 1, canopy }: TreeProps) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Rect x={-3.5} y={-17} width={7} height={18} rx={3} fill={islandScene.sandDark} />
      <Path
        d="M0 -54 C 11 -38, 18 -24, 17 -15 C 11 -8, -11 -8, -17 -15 C -18 -24, -11 -38, 0 -54 Z"
        fill={canopy}
      />
    </G>
  );
}

interface BushProps {
  x: number;
  y: number;
  scale?: number;
}

function Bush({ x, y, scale = 1 }: BushProps) {
  return (
    <Path
      d="M-15 0 C -16 -10, -8 -17, 0 -16 C 9 -15, 16 -9, 14 0 Z"
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill={islandScene.grassDark}
    />
  );
}

interface DiscoveryIslandProps {
  width: number;
}

/**
 * Layer 3 of the first-open scene — a small floating island, drawn as four
 * organic paths plus three trees.
 *
 * The path count is kept low on purpose (docs/implementation/10-performance.md):
 * this whole layer is scaled from ~0.2 to 1 during the push-in, and a detailed
 * silhouette costs more to rasterise every frame while reading as *less*
 * illustrated than one confident shape.
 */
export function DiscoveryIsland({ width }: DiscoveryIslandProps) {
  return (
    <Svg
      width={width}
      height={width * ISLAND_ASPECT}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      pointerEvents="none"
    >
      <G transform={`translate(0 ${BODY_OFFSET_Y})`}>
        <Path d={EARTH_PATH} fill={islandScene.sand} />
        <Path
          d={EARTH_SEAM_PATH}
          stroke={islandScene.sandDark}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.45}
          fill="none"
        />
        <Path d={GRASS_PATH} fill={islandScene.grass} />
        <Path d={GRASS_SHADE_PATH} fill={islandScene.grassDark} opacity={0.35} />

        <Tree x={68} y={52} scale={0.95} canopy={islandScene.grassDeep} />
        <Tree x={242} y={64} scale={0.72} canopy={islandScene.grassDark} />
        <Tree x={208} y={50} scale={0.55} canopy={islandScene.grassDeep} />
        <Bush x={122} y={64} scale={0.8} />
        <Bush x={268} y={82} scale={0.55} />

        {/* A scuff of bare earth — enough to suggest ground under Ollie. */}
        <Ellipse cx={150} cy={74} rx={8} ry={4} fill={islandScene.sandDark} opacity={0.45} />
      </G>
    </Svg>
  );
}
