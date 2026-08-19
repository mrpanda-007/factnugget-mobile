import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

interface AdventureBackdropProps {
  /** A World's themeKey (preferred) or id — see constants/tokens.ts#themeForWorldId. */
  worldId: string;
}

interface DiscoveryHeroArtProps {
  worldId: string;
  size: number;
}

/**
 * Full-bleed, illustrated scenery for the discovery deck. It deliberately
 * provides a real place for Ollie and the deck to inhabit rather than a
 * gradient behind a centred card.
 */
export function AdventureBackdrop({ worldId }: AdventureBackdropProps) {
  const isOcean = worldId === 'ocean';
  const isSpace = worldId === 'space';
  const isDinosaur = worldId === 'dinosaur';
  const isAnimal = worldId === 'animal';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 760" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="adventureSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={isSpace ? '#302C58' : isOcean ? '#6FAFBA' : '#A8C9A4'} />
          <Stop
            offset="0.58"
            stopColor={isSpace ? '#66598C' : isOcean ? '#B7DBD3' : isAnimal ? '#CAD5A9' : '#E6D18E'}
          />
          <Stop offset="1" stopColor={isSpace ? '#B19AB9' : isOcean ? '#D6E6CD' : '#D5B574'} />
        </LinearGradient>
        <RadialGradient id="adventureGlow" cx="72%" cy="14%" rx="76%" ry="70%">
          <Stop offset="0" stopColor="#FFF7C9" stopOpacity={0.72} />
          <Stop offset="1" stopColor="#FFF7C9" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="adventureGround" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={isOcean ? '#467F79' : isSpace ? '#514164' : '#567A51'} />
          <Stop offset="1" stopColor={isOcean ? '#245D62' : isSpace ? '#302843' : '#294D3D'} />
        </LinearGradient>
      </Defs>
      <Rect width={390} height={760} fill="url(#adventureSky)" />
      <Rect width={390} height={520} fill="url(#adventureGlow)" />

      {isSpace ? (
        <SpaceScenery />
      ) : isOcean ? (
        <OceanScenery />
      ) : isDinosaur ? (
        <DinosaurScenery />
      ) : isAnimal ? (
        <ForestScenery />
      ) : (
        <EarthScenery />
      )}

      <Path
        d="M0 565 C57 539 120 566 183 550 C267 525 332 543 390 526 V760 H0 Z"
        fill="url(#adventureGround)"
      />
      {/* Close foliage makes the scene feel observed through a real place. */}
      <G opacity={0.94}>
        <Path
          d="M0 740 C6 650 22 596 68 567 C53 635 47 702 64 760 H0 Z"
          fill={isOcean ? '#1D6669' : '#234F3D'}
        />
        <Path
          d="M0 691 C19 636 41 620 67 610 C47 653 37 704 40 760 H0 Z"
          fill={isOcean ? '#2E8D87' : '#3D7454'}
        />
        <Path
          d="M390 760 H333 C349 704 339 651 316 602 C361 626 383 677 390 760 Z"
          fill={isOcean ? '#1C6564' : '#244E3C'}
        />
        <Path
          d="M390 719 C369 672 347 648 325 641 C348 680 352 727 347 760 H390 Z"
          fill={isOcean ? '#3D9990' : '#497957'}
        />
      </G>
    </Svg>
  );
}

function DinosaurScenery() {
  return (
    <G>
      <Circle cx={315} cy={100} r={34} fill="#FFE5A0" opacity={0.9} />
      <Path
        d="M0 438 L64 282 L106 397 L166 227 L239 423 L304 308 L390 440 V570 H0 Z"
        fill="#6F8D67"
        opacity={0.74}
      />
      <Path
        d="M0 467 C39 422 71 438 113 420 C162 399 203 444 248 419 C301 389 347 423 390 403 V570 H0 Z"
        fill="#456D45"
      />
      <Path d="M76 402 L105 336 L136 402" fill="#A95D43" />
      <Path d="M101 351 l5 -26 l8 28" fill="#F2E8C6" />
      <Path
        d="M15 515 C28 451 45 420 76 400 C61 459 58 507 72 550 M49 531 C62 477 89 453 116 440 C95 482 94 520 99 554"
        fill="#2E6140"
      />
      <Path d="M304 546 C318 480 344 440 382 412 C360 477 355 516 365 555" fill="#315E41" />
    </G>
  );
}

function OceanScenery() {
  return (
    <G>
      <Path
        d="M0 206 C62 177 96 231 153 207 C214 181 274 218 390 182 V0 H0 Z"
        fill="#D7F1E7"
        opacity={0.34}
      />
      <Path
        d="M0 385 C72 332 105 403 168 359 C246 306 318 382 390 326 V570 H0 Z"
        fill="#4B9291"
        opacity={0.58}
      />
      <Path d="M0 475 C68 421 129 495 191 448 C250 405 316 468 390 426 V570 H0 Z" fill="#2E767A" />
      <Path
        d="M35 535 C39 463 56 443 73 438 C83 482 74 524 66 551 M68 539 C80 466 99 449 117 445 C121 491 108 528 95 553"
        stroke="#E48C74"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path
        d="M304 548 C312 482 328 451 345 442 C353 489 342 528 333 553 M343 548 C356 496 372 478 387 474"
        stroke="#7BC6AC"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Circle cx={86} cy={212} r={5} fill="#F4FFF7" opacity={0.8} />
      <Circle cx={102} cy={183} r={3} fill="#F4FFF7" opacity={0.7} />
      <Circle cx={280} cy={248} r={4} fill="#F4FFF7" opacity={0.65} />
    </G>
  );
}

function SpaceScenery() {
  return (
    <G>
      <Circle cx={306} cy={112} r={55} fill="#E7DDA6" opacity={0.82} />
      <Circle cx={291} cy={96} r={10} fill="#C7B87B" opacity={0.42} />
      <Circle cx={328} cy={132} r={7} fill="#C7B87B" opacity={0.45} />
      <Path
        d="M0 463 C72 409 122 452 176 427 C246 393 317 437 390 399 V570 H0 Z"
        fill="#443756"
        opacity={0.78}
      />
      <Path d="M0 510 C70 464 135 520 205 478 C280 435 327 490 390 458 V570 H0 Z" fill="#302A45" />
      <G fill="#FFF4BD">
        <Circle cx={55} cy={95} r={2.1} />
        <Circle cx={121} cy={191} r={1.7} />
        <Circle cx={198} cy={78} r={2.4} />
        <Circle cx={347} cy={247} r={2} />
        <Path d="M154 120 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" />
      </G>
    </G>
  );
}

function ForestScenery() {
  return (
    <G>
      <Circle cx={313} cy={103} r={39} fill="#FFF0B2" opacity={0.88} />
      <Path
        d="M0 447 C51 406 93 442 145 410 C204 372 263 425 320 391 C347 375 372 389 390 404 V570 H0 Z"
        fill="#5E8957"
      />
      <Path
        d="M16 509 l34 -115 l34 115 M73 511 l42 -151 l42 151 M276 510 l37 -130 l39 130 M328 514 l31 -99 l30 99"
        fill="#315D42"
      />
      <Path
        d="M26 447 l-23 38 h47 Z M115 427 l-34 51 h67 Z M316 442 l-28 44 h56 Z M357 453 l-25 39 h50 Z"
        fill="#79A668"
      />
    </G>
  );
}

function EarthScenery() {
  return (
    <G>
      <Path
        d="M0 431 L63 324 L117 417 L196 272 L267 427 L329 334 L390 432 V570 H0 Z"
        fill="#788E84"
      />
      <Path d="M0 489 C58 449 112 494 166 464 C230 430 283 474 390 430 V570 H0 Z" fill="#597659" />
      <Path d="M190 293 l22 -37 l22 39" fill="#F4F0DB" />
      <Path d="M52 346 l13 -21 l13 23" fill="#F5EAC6" />
      <Path
        d="M20 519 C92 490 142 526 218 495 C279 470 329 488 390 467"
        fill="none"
        stroke="#EAD19A"
        strokeWidth={8}
        opacity={0.85}
      />
    </G>
  );
}

/** Category-aware artwork for the front of a discovery card when final CMS art is absent. */
export function DiscoveryHeroArt({ worldId, size }: DiscoveryHeroArtProps) {
  if (worldId === 'ocean') return <OceanHeroArt size={size} />;
  if (worldId === 'space') return <SpaceHeroArt size={size} />;
  if (worldId === 'dinosaur') return <DinosaurHeroArt size={size} />;
  if (worldId === 'animal') return <AnimalHeroArt size={size} />;
  return <EarthHeroArt size={size} />;
}

function OceanHeroArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 140">
      <Defs>
        <LinearGradient id="oceanHero" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C9F0EC" />
          <Stop offset="1" stopColor="#4A9BAD" />
        </LinearGradient>
      </Defs>
      <Path
        d="M18 78 C15 45 43 21 80 23 C117 13 158 42 159 77 C164 107 138 128 104 123 C74 136 22 115 18 78 Z"
        fill="url(#oceanHero)"
      />
      <Path
        d="M20 82 C45 66 62 83 82 75 C105 65 129 84 158 65 V105 C130 130 62 135 27 108 Z"
        fill="#36859B"
        opacity={0.85}
      />
      <Path
        d="M54 77 C65 61 91 62 105 73 C99 85 83 89 68 84 L59 94 L59 86 L49 84 Z"
        fill="#E7EEE4"
        stroke="#355869"
        strokeWidth={2}
      />
      <Circle cx={124} cy={48} r={5} fill="#FFFDF0" opacity={0.9} />
      <Circle cx={136} cy={61} r={3} fill="#FFFDF0" opacity={0.75} />
      <Path
        d="M38 108 C41 94 50 91 52 111 M47 113 C52 99 59 97 62 115"
        stroke="#D47C6B"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SpaceHeroArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 140">
      <Defs>
        <RadialGradient id="planetHero" cx="34%" cy="28%" rx="72%" ry="72%">
          <Stop offset="0" stopColor="#E2D9F2" />
          <Stop offset="1" stopColor="#665382" />
        </RadialGradient>
      </Defs>
      <Circle cx={91} cy={72} r={46} fill="url(#planetHero)" />
      <Path
        d="M46 77 C69 54 111 47 143 58 C121 89 77 104 40 89"
        fill="none"
        stroke="#F2CF76"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Path d="M129 37 l17 -13 l-3 21 Z" fill="#F3D178" stroke="#4C3F60" strokeWidth={2} />
      <Circle cx={72} cy={57} r={9} fill="#806AA2" opacity={0.6} />
      <Circle cx={103} cy={91} r={13} fill="#806AA2" opacity={0.55} />
      <Path
        d="M26 28 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z M151 102 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z"
        fill="#FFF2B3"
      />
    </Svg>
  );
}

function DinosaurHeroArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 140">
      <Path
        d="M12 98 C19 64 47 48 78 56 C105 42 157 58 166 91 C160 118 118 126 89 116 C52 130 18 119 12 98 Z"
        fill="#A8C97C"
      />
      <Path d="M65 58 L82 22 L99 58" fill="#B85E45" stroke="#654333" strokeWidth={2} />
      <Path d="M79 31 l4 -13 l5 14" fill="#F5EBCB" />
      <Path
        d="M78 91 C87 68 119 66 136 83 C128 96 111 101 93 95 L84 107 L85 97 L69 96 Z"
        fill="#5D8A51"
        stroke="#3C5C3A"
        strokeWidth={2.5}
      />
      <Circle cx={117} cy={81} r={2.5} fill="#2E4030" />
      <Path
        d="M30 81 l11 -22 l12 22 M44 76 l12 -31 l13 31"
        fill="#527E48"
        stroke="#42633E"
        strokeWidth={2}
      />
    </Svg>
  );
}

function AnimalHeroArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 140">
      <Path
        d="M13 99 C17 64 43 51 72 57 C100 42 159 60 166 94 C156 122 114 125 88 116 C48 129 15 119 13 99 Z"
        fill="#B7D18A"
      />
      <Path
        d="M34 80 l13 -42 l15 42 M69 78 l16 -55 l17 55 M119 80 l13 -43 l15 43"
        fill="#47724B"
        stroke="#375A3C"
        strokeWidth={3}
      />
      <Path
        d="M99 102 C107 83 132 80 142 96 L137 108 H108 Z"
        fill="#C9915D"
        stroke="#594231"
        strokeWidth={2}
      />
      <Circle cx={130} cy={94} r={2.4} fill="#342D25" />
      <Path d="M25 102 C58 91 82 106 108 98" fill="none" stroke="#7FA56A" strokeWidth={4} />
    </Svg>
  );
}

function EarthHeroArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 140">
      <Path
        d="M14 100 C28 72 49 67 69 70 C95 47 145 58 166 91 C162 117 128 126 94 117 C54 130 19 120 14 100 Z"
        fill="#C79763"
      />
      <Path
        d="M24 99 l24 -46 l22 39 l27 -57 l31 62"
        fill="#779878"
        stroke="#526E57"
        strokeWidth={2}
      />
      <Path
        d="M19 109 C61 95 110 113 165 96"
        fill="none"
        stroke="#F7E5B7"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Path
        d="M117 91 h13 v-20 h-13 Z M133 94 h11 v-27 h-11 Z"
        fill="#F0D8A5"
        stroke="#7C5843"
        strokeWidth={1.5}
      />
    </Svg>
  );
}
