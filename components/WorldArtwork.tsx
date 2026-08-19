import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@constants/tokens';

interface WorldArtworkProps {
  /** A World's themeKey (or id) — an open string, matched against known theme keys below. */
  worldId: string;
  width: number | string;
  height: number | string;
}

function OceanArtwork({ width, height }: Omit<WorldArtworkProps, 'worldId'>) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="oceanWater" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ocean300} />
          <Stop offset="1" stopColor={colors.ocean900} />
        </LinearGradient>
      </Defs>
      <Rect width={360} height={220} fill="url(#oceanWater)" />
      <Path d="M0 164 C62 142 117 178 178 157 C240 136 300 166 360 145 V220 H0 Z" fill="#176B86" />
      <Path d="M0 184 C64 163 124 203 196 178 C253 158 310 190 360 169 V220 H0 Z" fill="#12566D" />
      <G opacity={0.62} fill="none" stroke="#EAF9FF" strokeWidth={3}>
        <Circle cx={278} cy={49} r={8} />
        <Circle cx={303} cy={79} r={4} />
        <Circle cx={260} cy={91} r={5} />
      </G>
      <G transform="translate(177 68)">
        <Path
          d="M-92 19 C-62 -20 22 -32 79 1 C94 10 100 27 84 36 C32 63 -51 58 -92 33 Z"
          fill="#D7EEF1"
        />
        <Path
          d="M80 5 C105 -14 125 -13 142 5 C120 8 115 22 135 37 C111 41 94 31 84 22 Z"
          fill="#B7DDE2"
        />
        <Path d="M-33 44 C-7 67 14 66 31 44" fill="#A5D2D9" />
        <Circle cx={-57} cy={17} r={4} fill={colors.ink900} />
        <Path
          d="M-77 31 C-60 39 -40 39 -22 31"
          fill="none"
          stroke="#719DA4"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path d="M-79 -1 C-73 -21 -60 -29 -43 -31 C-50 -13 -48 -2 -31 8" fill="#B7DDE2" />
      </G>
      <G transform="translate(283 159)">
        <Ellipse cx={0} cy={0} rx={27} ry={24} fill={colors.coral500} />
        <Circle cx={-9} cy={-4} r={3} fill={colors.ink900} />
        <Circle cx={9} cy={-4} r={3} fill={colors.ink900} />
        <Path
          d="M-20 16 C-39 31 -39 48 -24 53 M-8 19 C-19 40 -12 52 1 57 M8 19 C3 39 11 51 23 50 M20 14 C38 28 40 43 29 52"
          fill="none"
          stroke={colors.coral500}
          strokeWidth={9}
          strokeLinecap="round"
        />
      </G>
      <G strokeLinecap="round" fill="none">
        <Path d="M23 220 C23 191 13 176 19 148" stroke={colors.explorerGreen300} strokeWidth={8} />
        <Path d="M42 220 C45 191 64 176 59 151" stroke={colors.explorerGreen500} strokeWidth={9} />
        <Path d="M326 220 C327 189 316 177 321 148" stroke={colors.sunshine500} strokeWidth={7} />
      </G>
    </Svg>
  );
}

function SpaceArtwork({ width, height }: Omit<WorldArtworkProps, 'worldId'>) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="spaceSky" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.cosmic900} />
          <Stop offset="1" stopColor="#25204F" />
        </LinearGradient>
      </Defs>
      <Rect width={360} height={220} fill="url(#spaceSky)" />
      <G fill={colors.sunshine300}>
        <Circle cx={36} cy={37} r={2.5} />
        <Circle cx={91} cy={76} r={2} />
        <Circle cx={178} cy={35} r={3} />
        <Circle cx={309} cy={44} r={2} />
        <Circle cx={332} cy={102} r={3} />
        <Circle cx={228} cy={137} r={2} />
      </G>
      <Circle cx={56} cy={151} r={52} fill={colors.ocean500} />
      <Path
        d="M17 142 C35 127 50 130 59 139 C69 128 83 128 97 140 C91 166 76 184 54 199 C34 187 21 167 17 142 Z"
        fill={colors.explorerGreen500}
        opacity={0.86}
      />
      <G transform="translate(240 103) rotate(-35)">
        <Path d="M0 -61 C29 -40 34 10 0 50 C-34 10 -29 -40 0 -61 Z" fill="#F8F4E8" />
        <Path
          d="M0 -61 C14 -50 21 -35 23 -20 H-23 C-21 -35 -14 -50 0 -61 Z"
          fill={colors.coral500}
        />
        <Circle
          cx={0}
          cy={-4}
          r={13}
          fill={colors.ocean300}
          stroke={colors.ocean700}
          strokeWidth={4}
        />
        <Path d="M-19 29 L-37 49 L-13 44 M19 29 L37 49 L13 44" fill={colors.coral500} />
        <Path d="M-8 49 C-4 73 4 73 8 49" fill={colors.sunshine500} />
      </G>
      <G transform="translate(292 169) rotate(-8)">
        <Circle r={25} fill={colors.sunshine300} />
        <Ellipse rx={48} ry={11} fill="none" stroke={colors.coral300} strokeWidth={8} />
      </G>
    </Svg>
  );
}

function NatureArtwork({ worldId, width, height }: WorldArtworkProps) {
  const dinosaur = worldId === 'dinosaur';
  const animal = worldId === 'animal';
  return (
    <Svg width={width} height={height} viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <Rect
        width={360}
        height={220}
        fill={dinosaur ? colors.explorerGreen50 : animal ? colors.sunshine50 : colors.ocean50}
      />
      <Circle
        cx={300}
        cy={35}
        r={54}
        fill={dinosaur ? colors.sunshine300 : colors.ocean100}
        opacity={0.72}
      />
      <Path
        d="M0 159 C69 126 118 166 182 141 C249 115 301 153 360 125 V220 H0 Z"
        fill={colors.explorerGreen300}
      />
      <Path
        d="M0 184 C74 151 139 197 205 164 C268 134 318 171 360 150 V220 H0 Z"
        fill={colors.explorerGreen700}
      />
      {dinosaur ? (
        <G transform="translate(190 122)">
          <Path
            d="M-94 42 C-65 9 -26 -15 16 -10 C57 -5 71 23 58 50 L26 58 L8 93 H-14 L-8 53 L-54 53 L-67 86 H-89 L-81 43 Z"
            fill="#587849"
          />
          <Path
            d="M45 -1 C66 -32 96 -39 116 -24 C102 -7 101 11 112 28 C87 35 70 28 56 16 Z"
            fill="#587849"
          />
          <Circle cx={91} cy={-17} r={3} fill={colors.ink900} />
          <Path d="M104 -7 L121 -2 L106 3" fill="#F9F1DB" />
        </G>
      ) : animal ? (
        <G transform="translate(184 116)">
          <Ellipse rx={65} ry={47} fill="#D9A45D" />
          <Circle cx={51} cy={-39} r={29} fill="#D9A45D" />
          <Path d="M71 -49 C98 -74 112 -52 92 -25" fill="#D9A45D" />
          <Path
            d="M80 -31 C101 -9 98 20 81 38"
            fill="none"
            stroke="#D9A45D"
            strokeWidth={15}
            strokeLinecap="round"
          />
          <Circle cx={44} cy={-45} r={3} fill={colors.ink900} />
          <Path
            d="M-39 35 V89 M23 37 V89"
            stroke="#9B6A3E"
            strokeWidth={16}
            strokeLinecap="round"
          />
        </G>
      ) : (
        <G transform="translate(179 111)">
          <Circle r={61} fill={colors.ocean500} />
          <Path
            d="M-51 -18 C-22 -41 2 -32 11 -12 C34 -20 47 -7 48 11 C21 20 16 41 -4 51 C-25 40 -35 18 -51 -18 Z"
            fill={colors.explorerGreen500}
          />
        </G>
      )}
      <Path
        d="M17 220 C25 176 9 155 28 121 M337 220 C326 174 348 153 332 116"
        fill="none"
        stroke="#416A42"
        strokeWidth={13}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Bespoke, vector-native cover art. It has no network or WebGL cost and can be
 * swapped for commissioned assets without changing collection components. */
export function WorldArtwork(props: WorldArtworkProps) {
  if (props.worldId === 'ocean') return <OceanArtwork width={props.width} height={props.height} />;
  if (props.worldId === 'space') return <SpaceArtwork width={props.width} height={props.height} />;
  return <NatureArtwork {...props} />;
}
