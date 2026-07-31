# 02 — Folder Structure

> Part of the Kids Discovery implementation specification.

---

## Root Structure

```
app/
assets/
components/
features/
hooks/
navigation/
providers/
services/
store/
database/
types/
constants/
utils/
animations/
firebase/
docs/
tests/
```

| Folder | Contains |
|---|---|
| `app/` | Entry point and app-level composition |
| `assets/` | UI assets: icons, mascot artwork, illustrations, fonts, Lottie files (not educational content — see below) |
| `components/` | Shared, reusable UI primitives |
| `features/` | Self-contained feature modules |
| `hooks/` | Truly global hooks only |
| `navigation/` | Navigators and typed route definitions |
| `providers/` | React context providers |
| `services/` | Cross-cutting services (Firebase adapters, Content Service, purchases, notifications) |
| `store/` | Zustand stores |
| `database/` | Expo SQLite schema, migrations, queries (content cache + user-data cache) |
| `types/` | Shared TypeScript models |
| `constants/` | Design tokens and app constants |
| `utils/` | Pure helper functions |
| `animations/` | Shared Reanimated presets and Lottie wrappers |
| `firebase/` | Firebase config, rules, initialization |
| `docs/` | This specification |
| `tests/` | Global test setup and shared helpers |

Educational content is not part of the repository. It is fetched from Sanity through the Content Service in `services/` and cached in `database/` and the device filesystem — see `04-content-platform.md`.

---

## Feature Structure

Every feature under `features/` contains:

```
features/<feature>/
  components/
  hooks/
  types/
  services/
  constants/
  screens/
  utils/
  tests/
```

Rules:

- Avoid large shared folders.
- Keep code close to where it is used.
- Only promote something to a root-level folder once it is genuinely used by more than one feature.

---


---

## Assets Folder

`assets/` holds UI assets only — icons, mascot artwork, illustrations, splash screens, fonts, and Lottie animation files — never educational content images, which are downloaded from Sanity and cached on the device filesystem instead (see `06-content-sync-engine.md`).

- WebP compressed.
- Multiple resolutions where appropriate.
