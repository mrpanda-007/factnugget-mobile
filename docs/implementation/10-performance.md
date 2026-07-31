# 10 — Performance

> Part of the Kids Discovery implementation specification.

---

## Target

**60 FPS**, consistently, on mid-range devices.

---

## Rendering

- Lazy load heavy screens.
- Memoize expensive components.
- Avoid unnecessary renders.
- Use `FlatList` for large collections — never `map()` over long lists.
- Keep component trees shallow.

---

## Animations

- Use React Native Reanimated on the UI thread.
- Use Gesture Handler for all touch interaction.
- Lottie for illustrative animation only.
- Animation durations come from design tokens, never hardcoded.
- Do not add additional animation libraries.

---

## Images

- WebP, compressed.
- Multiple resolutions where appropriate.
- Local assets over remote fetches.
- Size images to their render dimensions.

---

## Data

- Read from SQLite for anything on a hot path.
- Do not block first render on a network request.
- Let TanStack Query serve cached data immediately and revalidate in the background.

---

## Accessibility (performance-adjacent)

- Large touch targets
- VoiceOver compatible
- Dynamic font support
- Readable contrast
- Screen reader labels

Dynamic type must not break layout or cause reflow jank.
