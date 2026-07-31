# 02 — Component Architecture

> Part of the FactNuggets design specification.
> Extends the canonical baseline set from `docs/implementation/01-project-architecture.md#components`. The four components marked **(new)** below are genuine additions the brief requires (mascot, world backdrops, reward sequence, shelf item) — not variations of an existing component, so they are new library members rather than invented architecture. Everything else reuses the canonical name exactly; e.g. the brief's "WorldCard" is built as `CategoryCard`, not a parallel component.

---

## Composition Rules

1. Screens never hardcode a color, spacing value, radius, or duration — they consume `constants/tokens.ts` / Tailwind classes only.
2. A screen's only job is to lay out components and wire data; visual logic lives in the component.
3. Never duplicate UI — extend an existing component via props before creating a new one.
4. Every component in this document lives in `components/` (cross-cutting, per `02-folder-structure.md`) since every one of them is used by more than one feature.
5. Decorative/animated children are marked `accessible={false}`; the component itself carries the `accessibilityLabel`.

---

## Primitives

### `Button`

```ts
type ButtonVariant = 'primary' | 'secondary' | 'icon';
type ButtonSize = 'default' | 'large'; // large = 64pt, used for the single most important CTA on a screen

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant; // default 'primary'
  size?: ButtonSize; // default 'default'
  icon?: ReactNode; // leading icon/emoji
  disabled?: boolean;
  accessibilityLabel?: string; // falls back to label
}
```

- `primary`: filled with the active world's (or default Ocean) primary color, `textInverse` label, `radius-md`, `elevation.resting` → `raised` on press.
- `secondary`: `surface` fill, `1px` `border` outline, primary-color label.
- `icon`: circular, `radius-pill`, 44×44 minimum — back/close/sound-toggle.
- Press feedback: `snappy` spring scale to 0.96 and back — see `03-animation-strategy.md`.

### `Card`

Base surface primitive other cards compose (not used directly by screens often, but `DiscoveryCard`/`CategoryCard`/collection items all build on it).

```ts
interface CardProps {
  children: ReactNode;
  elevation?: 'resting' | 'raised' | 'floating'; // default 'resting'
  radius?: 'md' | 'lg' | 'xl'; // default 'lg'
  padding?: 'md' | 'lg' | 'xl'; // default 'lg'
  onPress?: () => void; // if present, card is pressable and gets the standard press spring
}
```

### `ProgressBar`

```ts
interface ProgressBarProps {
  progress: number; // 0–1
  color?: string; // defaults to active world's primary token
  label?: string; // e.g. "75% complete" — rendered above the bar, not inside it
}
```

Linear only (per the brief's "75% complete" examples). Animates width changes with a `base` timing, never jumps.

### `Badge`

```ts
interface BadgeProps {
  label: string; // "Ocean Explorer", not "Level 3"
  icon: string; // emoji or small SVG glyph
  tone?: 'default' | 'gold'; // 'gold' = earned/reward context, adds a subtle sunshine glow
}
```

### `SectionHeader`

```ts
interface SectionHeaderProps {
  title: string; // "Continue Exploring", "My Collection"
  action?: { label: string; onPress: () => void }; // optional "See all"
}
```

---

## Identity & World Visuals

### `Avatar`

```ts
interface AvatarProps {
  identity: ExplorerIdentityId; // 'animal' | 'space' | 'ocean' | 'world'
  size?: number; // default 64
}
```

Renders the explorer's chosen identity as a circular, softly-shadowed portrait (illustration-composition — see `04-asset-strategy.md`).

### `ExplorerCharacter` (new)

The mascot. Appears on Welcome, Explorer Identity, and Completion.

```ts
type CharacterState = 'idle' | 'wave' | 'blink' | 'celebrate';

interface ExplorerCharacterProps {
  state: CharacterState;
  size?: number; // default 160
}
```

- `idle`: slow breathing scale loop (`ambient` duration, `gentle` spring).
- `blink`: periodic quick scale-Y on the eyes layer, randomized interval so it never feels mechanical.
- `wave`: one-shot arm rotation, `bouncy` spring, triggered on screen entrance.
- `celebrate`: bigger bounce + look-up, used by `RewardAnimation`.

### `WorldBackground` (new)

The animated environment backdrop for `WorldHome` and `DiscoveryCard` screens.

```ts
interface WorldBackgroundProps {
  world: WorldTheme; // ocean | space | dinosaur | animal | earth — see 00-design-system.md
  intensity?: 'subtle' | 'full'; // 'subtle' behind readable content, 'full' on hero moments
}
```

Each world defines its own small set of ambient layers (e.g. Ocean: gradient wash + a few bubble shapes drifting up + 1–2 fish silhouettes drifting sideways). All motion is `ambient`-duration looping via `withRepeat`, all layers `accessible={false}`, and the whole component renders a static single frame (first animation frame) when reduced motion is on rather than looping forever.

---

## Composite Cards

### `CategoryCard` (the brief's "WorldCard")

```ts
interface CategoryCardProps {
  world: WorldTheme;
  title: string; // "Ocean Secrets"
  progress?: number; // 0–1, omitted if not started
  discoveriesFound?: number; // "12 discoveries found"
  onPress: () => void;
}
```

Used on Discovery Selection and inside World Home's "New Discoveries" row. Composes `Card` + `WorldBackground` (`subtle`) + `ProgressBar`.

### `DiscoveryCard`

The core learning-card museum piece.

```ts
interface DiscoveryCardProps {
  discovery: Discovery; // types/Discovery.ts, mirrors 05-content-schema.md
  revealed: boolean; // has the child tapped to reveal the explanation yet
  onReveal: () => void;
  onNext: () => void;
  onPrevious?: () => void;
}
```

Layout: large illustration slot (top), `title` + `funFact` (`body-lg`, always visible), tap target over the illustration that triggers `onReveal` → reveals `easyDescription`/`mediumDescription` with a gentle slide+fade, then Next appears.

### `Sticker`

```ts
interface StickerProps {
  discovery: Pick<Discovery, 'id' | 'title' | 'stickerReward'>;
  earned: boolean; // unearned = silhouette, per Montessori "visible but not yet mine" pattern
  size?: number;
}
```

### `CollectionItem` (new)

Thin composition wrapping `Sticker` + a label, for the shelf grid.

```ts
interface CollectionItemProps {
  discovery: Discovery;
  onPress: () => void; // opens the Quick Recall sheet
}
```

### `RewardAnimation` (new)

The completion celebration sequence.

```ts
interface RewardAnimationProps {
  badge: { icon: string; label: string }; // "🏆 Ocean Explorer Badge" — never a numeric score
  onComplete: () => void; // called once the sequence finishes, reveals the "what next?" choices
}
```

Timeline (see `03-animation-strategy.md` for exact `withSequence`): chest/container opens → a handful of star/particle shapes burst outward and settle → badge scales in → `ExplorerCharacter` `celebrate` state plays alongside.

---

## Parent-Only

### `ParentalGate`

Required before any in-app purchase or external link, and — per this app's screen map — before entering the Parent Area at all.

```ts
interface ParentalGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}
```

- Presents a simple two-number addition problem (e.g. "What is 8 + 5?"), regenerated each time — never the same problem twice in a row.
- Voice-forward: an optional narrated prompt ("Ask a grown-up to help!") so pre-literate children understand a parent needs to be involved, per `docs/implementation/13-apple-kids-compliance.md#parental-gates`.
- Wrong answer: gentle retry, no penalty, no lockout, no shaming copy.
- This is the **only** place gate logic lives — no feature re-implements a gate.

---

## Component Build Order

Tokens must exist first; after that, build bottom-up so nothing references a component that doesn't exist yet:

```
tokens
  ↓
Button, Card, SectionHeader, Badge, ProgressBar
  ↓
Avatar, ExplorerCharacter, WorldBackground
  ↓
CategoryCard, DiscoveryCard, Sticker, CollectionItem, RewardAnimation
  ↓
ParentalGate (standalone — only the Parent feature depends on it)
```
