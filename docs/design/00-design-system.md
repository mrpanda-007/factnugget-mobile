# 00 — Design System

> Part of the FactNuggets design specification.
> This document defines the concrete visual and motion tokens for the app. It replaces the placeholder comments in `constants/tokens.ts` and `tailwind.config.js`. Architecture and layering rules live in `docs/implementation/01-project-architecture.md#theme--design-tokens` — this document is the values that fill that contract.

---

## Design Intent

FactNuggets should feel like **a magical museum built for children** — premium, warm, playful, safe, curious. Not a cartoon app, not a corporate app, not a gamified addiction loop.

Every visual decision is checked against:

- Would this feel expensive and handcrafted, or cheap and noisy?
- Would a 5–8 year old want to touch this?
- Would a parent glancing over feel reassured, not alarmed?

Explicit avoid-list (from the product brief): black backgrounds, corporate navy, harsh gradients, neon colors, sharp corners, cluttered screens, meaningless numeric rewards ("500 XP").

---

## Color System

### Core Palette

| Token                           | Hex                                                         | Use                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `cream`                         | `#FFFBF3`                                                   | App background — the warm "paper" every screen sits on. Never pure white, never black.                                               |
| `sand`                          | `#F2E4CE`                                                   | Secondary warm neutral — section backgrounds, dividers, empty states.                                                                |
| `surface`                       | `#FFFFFF`                                                   | Card surfaces only — never a full-screen background.                                                                                 |
| `ink-900`                       | `#2B2540`                                                   | Primary text. Soft near-black with a warm plum undertone — never `#000000`.                                                          |
| `ink-600`                       | `#5B5570`                                                   | Secondary text.                                                                                                                      |
| `ink-400`                       | `#8B86A0`                                                   | Tertiary text, placeholders, disabled state.                                                                                         |
| `ocean-50/100/300/500/700/900`  | `#EAF6FF` `#CFEBFC` `#7CCBEE` `#3AAAE1` `#1F7FB8` `#134D73` | Primary brand blue (Ocean Blue). `500` is the app's primary action color.                                                            |
| `explorer-green-50/300/500/700` | `#EAFBF3` `#8DE0C0` `#3FBF8F` `#268F68`                     | Growth, success, nature, completion.                                                                                                 |
| `sunshine-50/300/500/700`       | `#FFF6E0` `#FFDE8A` `#FFC94A` `#E0A424`                     | Warm Yellow — rewards, stars, highlights.                                                                                            |
| `coral-50/300/500/700`          | `#FFEFE9` `#FFB79E` `#FF8B66` `#E5623B`                     | Coral Orange — energy accent, primary CTA warmth.                                                                                    |
| `cosmic-50/300/500/700/900`     | `#F4EEFF` `#DCC8FA` `#C9B6F2` `#8F6FD1` `#4B3B7A`           | Pastel Purple — space/magic accent, `900` is the deep-space background tone (used as a dark accent, never as an app-wide dark mode). |

### Semantic Aliases

| Alias             | Maps to                               | Notes                                                                                       |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `background`      | `cream`                               |                                                                                             |
| `surface`         | `surface`                             |                                                                                             |
| `surfaceElevated` | `surface` + `elevation.raised` shadow |                                                                                             |
| `textPrimary`     | `ink-900`                             |                                                                                             |
| `textSecondary`   | `ink-600`                             |                                                                                             |
| `textInverse`     | `#FFFFFF`                             | Text on saturated color fills                                                               |
| `success`         | `explorer-green-500`                  |                                                                                             |
| `border`          | `sand`                                | Hairline dividers only — borders are rare; prefer spacing and elevation to separate content |

### World Themes

Each discovery world gets its own accent pairing so it reads as a distinct miniature environment, while staying inside the core palette (no world invents a new hue):

| World          | Primary              | Secondary              | Tint (background wash)   |
| -------------- | -------------------- | ---------------------- | ------------------------ |
| 🌊 Ocean       | `ocean-500`          | `explorer-green-500`   | `ocean-50` → `ocean-100` |
| 🚀 Space       | `cosmic-700`         | `sunshine-500` (stars) | `cosmic-500` purple wash |
| 🦖 Dinosaur    | `explorer-green-500` | `coral-500`            | `sand`                   |
| 🐘 Animal      | `sunshine-500`       | `coral-500`            | `sand`                   |
| 🌎 World/Earth | `ocean-500`          | `explorer-green-500`   | `sand`                   |

`WorldBackground` and `CategoryCard` (see `02-component-architecture.md`) are the only components that consume these theme objects directly — screens never hardcode a world's colors.

A world's **tint → background pair is the full range of a `WorldBackground` gradient**, and `textPrimary` sits on top of it. Both ends must therefore clear 4.5:1 against `textPrimary`, which rules out very dark washes (Space originally used `cosmic-900` and made card copy unreadable). A genuinely dark world background requires introducing a per-world text color first — don't just darken the token.

---

## Typography

Two families, one job each:

- **Fredoka** (SemiBold / Bold) — display, headlines, screen titles, button labels. This is the brand's "voice" — rounded, confident, friendly.
- **Nunito** (Regular / SemiBold / ExtraBold) — body copy, facts, captions, anything read at length. Chosen over using Fredoka everywhere because a full screen of display-weight type fatigues readability; Nunito is the proven workhorse for small-size legibility.

Both load via `@expo-google-fonts/fredoka` and `@expo-google-fonts/nunito` (see `constants/tokens.ts` and `App.tsx` font-loading gate). No system-font fallback in steady state — first paint waits on `useFonts()`.

### Scale

| Token        | Family / Weight  | Size | Line height | Use                                               |
| ------------ | ---------------- | ---- | ----------- | ------------------------------------------------- |
| `display-xl` | Fredoka Bold     | 34   | 1.2         | Welcome headline                                  |
| `display-lg` | Fredoka SemiBold | 28   | 1.25        | Screen titles ("Ocean Secrets")                   |
| `display-md` | Fredoka SemiBold | 22   | 1.3         | Card titles, section headers                      |
| `body-lg`    | Nunito SemiBold  | 18   | 1.4         | The fact itself ("An octopus has three hearts")   |
| `body-md`    | Nunito Regular   | 16   | 1.45        | Supporting explanation                            |
| `body-sm`    | Nunito Regular   | 14   | 1.4         | Captions, meta ("12 discoveries found")           |
| `label`      | Nunito ExtraBold | 15   | 1.2         | Button labels, badge text — slight letter-spacing |

Rules: minimum body text size is 16 (`body-md`); `body-sm` is for secondary meta only, never a primary fact. Never rely on color alone to communicate state — pair with icon/shape.

---

## Spacing Scale

4pt base, generous by default (children need visual breathing room, not density):

| Token       | Value |
| ----------- | ----- |
| `space-xs`  | 4     |
| `space-sm`  | 8     |
| `space-md`  | 12    |
| `space-lg`  | 16    |
| `space-xl`  | 24    |
| `space-2xl` | 32    |
| `space-3xl` | 48    |
| `space-4xl` | 64    |

## Radius Scale

Nothing sharp, anywhere:

| Token         | Value | Use                              |
| ------------- | ----- | -------------------------------- |
| `radius-sm`   | 12    | Small chips, badges              |
| `radius-md`   | 20    | Buttons, inputs                  |
| `radius-lg`   | 28    | Standard cards                   |
| `radius-xl`   | 36    | Hero cards, sheets               |
| `radius-pill` | 999   | Pills, avatars, circular buttons |

## Elevation

Shadows are warm-tinted (from `ink-900`, never pure black) and used to communicate "tap me" depth, not decoration:

| Token      | shadowOpacity | shadowOffset | shadowRadius | Android `elevation` |
| ---------- | ------------- | ------------ | ------------ | ------------------- |
| `resting`  | 0.08          | `{0, 2}`     | 6            | 2                   |
| `raised`   | 0.12          | `{0, 6}`     | 12           | 6                   |
| `floating` | 0.16          | `{0, 12}`    | 20           | 12                  |

`resting` = default card state. `raised` = pressed/active or "the thing you should notice." `floating` = modals, the reward sequence, anything meant to feel like it's lifted off the page.

## Touch Targets

- Primary actions (buttons, discovery cards, world cards): **56×56 minimum**.
- Secondary/icon controls (back, sound toggle, close): **44×44 minimum** (HIG floor).
- Always paired with a visible pressed state (scale + elevation change — see `03-animation-strategy.md`), never opacity alone.

---

## Motion Tokens

Extends the existing `animationDurations` in `constants/tokens.ts` rather than replacing it.

### Durations (ms)

| Token         | Value | Use                                         |
| ------------- | ----- | ------------------------------------------- |
| `fast`        | 150   | Micro feedback (press)                      |
| `base`        | 250   | Standard transitions                        |
| `slow`        | 400   | Entrances, reveals                          |
| `celebration` | 600   | Reward beats                                |
| `ambient`     | 4000+ | Background looping motion (clouds, bubbles) |

### Spring Presets

| Token    | damping | stiffness | mass | Use                                  |
| -------- | ------- | --------- | ---- | ------------------------------------ |
| `gentle` | 16      | 120       | 1    | Card entrances, floating idle motion |
| `bouncy` | 10      | 160       | 1    | Rewards, mascot reactions            |
| `snappy` | 20      | 220       | 0.9  | Button press response                |

Full choreography rules per interaction type live in `03-animation-strategy.md`.

---

## Accessibility

- **Reduced motion**: when `useReducedMotion()` (Reanimated) is true, ambient/looping motion and particle effects are skipped or replaced with a single simple fade; springs are replaced with a `fast` timing fade. Nothing disappears — the reduced-motion path shows the same content, just without the extra motion layer.
- **Contrast**: `textPrimary`/`textSecondary` on `background`/`surface` meet 4.5:1 minimum. Text is never placed directly on a busy illustration without a scrim/surface behind it.
- **Dynamic type**: text containers use flexible height (no fixed-height text boxes) so larger system font sizes reflow instead of clipping.
- **Screen readers**: every interactive element gets an `accessibilityLabel`/`accessibilityRole`; decorative background elements (`WorldBackground` particles) are marked `accessible={false}`.
- **Color independence**: progress/completion state is always paired with an icon or shape change, never color alone.
