# 03 — Animation Strategy

> Part of the FactNuggets design specification.
> Reanimated-only choreography rules. Tokens referenced here (durations, springs) are defined in `00-design-system.md` and implemented in `constants/tokens.ts`. Performance rules are inherited from `docs/implementation/10-performance.md` — this document does not restate the 60 FPS target, it defines how to hit it.

---

## Principles

1. **Slow, smooth, premium — not mobile-game chaos.** Reference point is Apple product animation and Monument Valley, not a rewards-slot-machine.
2. **Everything runs on the UI thread.** Every animation in this app is Reanimated (`useSharedValue` + `useAnimatedStyle`) or Gesture Handler driven. No `Animated` API, no JS-thread interval-based motion, no additional animation library.
3. **Motion always communicates something** — arrival, feedback, causality, delight. Never decoration for its own sake, never so constant it becomes noise.
4. **Reduced motion is a first-class path, not an afterthought.** Every animated component checks Reanimated's built-in `useReducedMotion()` and has a defined non-animated (or minimally-animated) equivalent — see the last section.

---

## Interaction Choreography

### Button / tappable card press

```
onPressIn  → scale to 0.96, spring: snappy
onPressOut → scale to 1.0,  spring: snappy
```

Paired with an elevation step-down (`raised` → `resting`) while pressed, so the "compress" reads physically, not just visually smaller.

### Card entrance (screen mount, list item mount)

```
opacity 0 → 1,  translateY 12 → 0,  scale 0.98 → 1
duration: slow, easing: standard ease-out
stagger: 60ms between siblings, capped at 5 items (never stagger a long list — see Performance below)
```

### Floating / idle motion (mascot breathing, drifting bubbles, gentle card float)

```
withRepeat(
  withSequence(
    withTiming(+delta, { duration: ambient, easing: easeInOutSine }),
    withTiming(-delta, { duration: ambient, easing: easeInOutSine })
  ),
  -1, true
)
```

`delta` is small (translateY 4–8px, or scale 1.0↔1.03) — this is ambient texture, not a focal animation. Each instance gets a randomized phase offset (`withDelay` on mount) so multiple floating elements never move in visible unison.

### Reveal (tap-to-reveal on `DiscoveryCard`)

```
height/opacity of the explanation block: 0 → auto/1, duration: slow
accompanied by a small particle/sparkle burst (2–4 shapes, base duration) at the tap point
```

### Celebration (`RewardAnimation`)

A single `withSequence` timeline, not independently-triggered pieces:

```
1. Container "opens"        — scaleY 0 → 1 on a lid element,      bouncy spring
2. Particle burst           — 6–10 star/shape Views animate outward from center with
                               staggered withDelay (0–120ms), then fall/fade, celebration duration
3. Badge scale-in            — scale 0 → 1.1 → 1.0,                 bouncy spring, delayed until step 2 is ~60% through
4. ExplorerCharacter → 'celebrate' state triggered in parallel with step 3
5. onComplete() fires once the badge settles — this is what reveals the "what next?" choices
```

Total sequence target: **under 2.5s** — long enough to feel earned, short enough that a 6-year-old doesn't get impatient waiting to see their reward.

### Screen transitions (React Navigation)

Native Stack's default platform transitions are used as-is (per `00-tech-stack.md` — no custom transition library). The only in-house transition work is _within_ a screen (entrances above), not _between_ screens.

---

## Gesture Handler Usage

Gesture Handler drives:

- Press/long-press feedback on all tappable components (via `Pressable`'s built-in gesture integration is acceptable for simple taps; Gesture Handler proper is used where a custom gesture is needed).
- The `DiscoveryCard` next/previous affordance, if implemented as a swipe in addition to tap (tap remains the primary, reliable path for this age group — see `01-screen-map.md`).

No custom pan/drag interactions elsewhere in this pass (no drag-to-reorder, no swipe-to-dismiss) — out of scope until a real need appears.

---

## Lottie Usage

`lottie-react-native` is **not currently installed**. It's approved by `docs/implementation/00-tech-stack.md`, but no Lottie files ship in this pass — hand-crafting convincing Lottie JSON without a motion designer produces worse results than the Reanimated/SVG choreography above, so shipping the native dependency would have been unused weight (and an unused native module is a real cost in Expo Go, where it must exist in the host binary).

Install it (`npx expo install lottie-react-native`) at the point real motion-designer-authored files actually arrive: mascot idle loops, bespoke celebration effects. Nothing in the current code needs to change to accommodate that — the animation surfaces it would replace are self-contained components.

---

## Performance Rules (application of `10-performance.md` to motion specifically)

- Animate only `transform` and `opacity` — never `width`/`height`/`top`/`left` directly (the one exception, the reveal block's height, uses Reanimated's layout animation primitives, which are still UI-thread).
- Stagger caps at 5 items; long lists (`CollectionScreen`'s shelf) do not stagger-animate every item — only items entering the viewport for the first time, and only up to the cap.
- `WorldBackground` ambient layers are capped at 4–6 simultaneously animated elements per screen.
- Every `withRepeat(..., -1, ...)` loop is torn down on unmount (cleanup in `useEffect`/component unmount) — never left running off-screen.

---

## Reduced Motion

When `useReducedMotion()` is true:

| Full-motion behavior             | Reduced-motion equivalent                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Ambient floating/breathing loops | Static single frame, no loop                                                                       |
| Card entrance slide+fade+scale   | Opacity fade only, `fast` duration                                                                 |
| Button press spring              | Opacity dim (no scale)                                                                             |
| Celebration particle burst       | Badge and label fade/scale in directly, no particles, `onComplete` fires after a short fixed delay |
| Mascot idle/blink/wave           | Static pose per state, no looping                                                                  |

Nothing is ever hidden or removed in reduced-motion mode — only the motion layer changes.
