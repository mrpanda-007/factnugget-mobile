# 04 — Asset Strategy

> Part of the FactNuggets design specification.
> Covers UI asset strategy only (icons, illustration placeholders, fonts, Lottie). Educational content images are a separate concern owned by Sanity — see `docs/implementation/04-content-platform.md` and `05-content-schema.md`. Format/compression rules are inherited from `docs/implementation/10-performance.md`.

---

## Reality Check

There is no illustrator or art pipeline yet — `assets/lottie/` and `assets/images/` (beyond the app icon set) are empty, and commissioning Pixar-quality illustration is outside what this implementation pass can produce. Rather than blocking on that, this document defines a **placeholder illustration system** that is deliberately composed (not bare emoji-on-white) and **architected so real artwork swaps in later with zero component refactor** — every illustration slot takes a `source` prop that accepts either a real image/Sanity URL or falls back to the placeholder composition.

---

## Iconography: Emoji-First

World themes, navigation, and card subjects use large emoji as the primary iconography (🌊🚀🦖🐘🌎⭐🔒), not a custom icon font. This is a deliberate design choice, not a shortcut:

- Matches the brief's own visual language throughout.
- Renders identically on iOS and Android with zero asset weight or extra library.
- Universally understood pre-literacy — "visual communication first" (`00-product-vision.md`).
- Full color and expressive by default, which a monochrome icon font is not.

**Where emoji doesn't fit** (small UI chrome: back chevron, close, checkmark, speaker/mute), a minimal hand-coded SVG icon set is used instead, via `react-native-svg`:

| Icon                   | Used by                                              |
| ---------------------- | ---------------------------------------------------- |
| Chevron (back)         | Native Stack header replacement / in-card navigation |
| Close (×)              | Modals, sheets                                       |
| Check                  | Completion states, reveal confirmation               |
| Speaker / speaker-mute | Sound toggle (Parent Area)                           |

Each is a single hand-authored `<Svg>` with 1–2 paths, sized via the standard icon-button touch target (44×44), colored via `currentColor`-style prop passthrough — never a bitmap.

---

## Illustration Placeholder System

Every "hero" illustration slot (Discovery Card artwork, world card art, mascot, badge) is composed from three layers, not a single flat emoji:

```
1. Shape layer   — an organic blob/rounded-container built with react-native-svg,
                    filled with a soft gradient (expo-linear-gradient) from the
                    active world/theme's tint → primary color.
2. Content layer — the large emoji (or, later, the real illustration/photo),
                    centered, at ~55–65% of the container's size so it reads
                    as "staged inside" the shape rather than stretched to fill it.
3. Depth layer    — a soft `elevation.floating` shadow beneath the whole
                    composition, plus 1–2 small decorative particle shapes
                    (SVG) near the edge for texture.
```

This composition is itself a small internal helper (`IllustrationStage`, used by `DiscoveryCard`, `CategoryCard`, `Sticker`, `Badge` — not part of the public component list in `02-component-architecture.md` since it's an implementation detail of those components, not a screen-facing component on its own) — it is not re-invented per screen.

### Swap-in Path

`IllustrationStage` accepts:

```ts
interface IllustrationStageProps {
  emoji: string; // always present — the guaranteed fallback
  imageUrl?: string; // Sanity-delivered image, once 04-content-platform.md ships
  theme: WorldTheme;
  size?: number;
}
```

When `imageUrl` is present, the content layer renders that image (via the local filesystem cache per `06-content-sync-engine.md`) instead of the emoji, inside the exact same shape/depth layers. No screen or calling component changes when real art arrives.

---

## Mascot Strategy

The Explorer mascot (`ExplorerCharacter`) is built the same layered way: a simple, friendly rounded-blob character (SVG shapes: body, eyes, simple limbs) rather than a bitmap sprite sheet, so its four states (`idle`/`blink`/`wave`/`celebrate` — see `02-component-architecture.md`) are just transform animations on existing shape layers, not swapped images. This keeps the mascot lightweight and infinitely re-colorable per world/identity, and is the realistic MVP version of "Pixar-level character" given no character designer yet — replace with a commissioned character rig later behind the same `ExplorerCharacter` props if/when that exists.

---

## Motion Assets (Lottie)

`lottie-react-native` is **not installed** this pass (see `03-animation-strategy.md#lottie-usage` for why an unused native dependency was deliberately not shipped). `assets/lottie/` stays empty until real motion-designer-authored files exist; install the package at the same time those land. Reserved future uses: a richer mascot idle loop, a bespoke celebration effect, confetti with real physics. Do not hand-author placeholder Lottie JSON — it reads as worse than the Reanimated/SVG version already built.

---

## Fonts

`@expo-google-fonts/fredoka` and `@expo-google-fonts/nunito` bundle their `.ttf` files inside the npm package itself — no manual file management under `assets/fonts/` is needed for these two families. `assets/fonts/` stays reserved for any future non-Google-Fonts typeface.

---

## Image Format & Compression Rules

Inherited from `10-performance.md`, restated for this app's specific asset types:

- Any UI bitmap asset that is added later (app icons, splash, adaptive icon layers — already present) stays WebP where the platform allows it, PNG only where required (iOS icon).
- Educational content images are never bundled into the app binary — they come from Sanity's CDN and are cached locally (`06-content-sync-engine.md`). This document's placeholder system exists precisely to avoid needing bundled content art before that pipeline exists.
- Multiple resolutions (`@1x`/`@2x`/`@3x`) apply once real bitmap illustration assets are introduced.

---

## Summary: What Ships Now vs Later

| Asset type            | This pass                                                  | Later                                                               |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Icons (chrome)        | Hand-coded SVG, 4 icons                                    | Expand set as needed                                                |
| Icons (world/subject) | Emoji                                                      | Unchanged — emoji stays the strategy                                |
| Illustrations         | `IllustrationStage` composition (shape + gradient + emoji) | Real artwork/Sanity images via the same component's `imageUrl` prop |
| Mascot                | SVG shape-based `ExplorerCharacter`                        | Possible commissioned character rig, same props                     |
| Celebration motion    | Reanimated + SVG                                           | Optional Lottie files (+ the package) from a motion designer        |
| Fonts                 | Fredoka + Nunito via Google Fonts packages                 | Unchanged                                                           |
