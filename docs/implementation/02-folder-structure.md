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
repositories/
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

| Folder                     | Contains                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                     | Entry point and app-level composition                                                                                                                                                                                         |
| `assets/`                  | UI assets: icons, mascot artwork, illustrations, fonts, Lottie files (not educational content — see below)                                                                                                                    |
| `components/`              | Shared, reusable UI primitives                                                                                                                                                                                                |
| `features/`                | Self-contained feature modules                                                                                                                                                                                                |
| `hooks/`                   | Truly global hooks only                                                                                                                                                                                                       |
| `navigation/`              | Navigators and typed route definitions                                                                                                                                                                                        |
| `providers/`               | React context providers                                                                                                                                                                                                       |
| `repositories/`            | Cross-cutting repositories (`ProgressRepository`, `ContentRepository`, `PurchaseRepository`, etc.) — the data-access layer between hooks/TanStack Query and `services/`. See `01-project-architecture.md#repositories-layer`. |
| `services/`                | Cross-cutting platform services. Optional parent-account and sync orchestration begins as contracts in Phase 9; see `01-project-architecture.md#service-layer`.                                                               |
| `store/`                   | Zustand stores                                                                                                                                                                                                                |
| `database/`                | Expo SQLite schema, migrations, and queries. The cloud account binding and durable outbox are planned for Phase 9D, not present yet.                                                                                          |
| `types/`                   | Shared TypeScript models                                                                                                                                                                                                      |
| `constants/`               | Design tokens and app constants                                                                                                                                                                                               |
| `utils/`                   | Pure helper functions                                                                                                                                                                                                         |
| `animations/`              | Shared Reanimated presets and Lottie wrappers                                                                                                                                                                                 |
| `infrastructure/firebase/` | Centralized optional Firebase client configuration and initialization. Phase 9C uses Auth only; no Firestore adapter exists yet.                                                                                              |
| `docs/`                    | This specification                                                                                                                                                                                                            |
| `tests/`                   | Global test setup and shared helpers                                                                                                                                                                                          |

Educational content is not part of the repository. It is fetched from Sanity through `ContentService` (`services/`) via `ContentRepository` (`repositories/`) and cached in `database/` and the device filesystem — see `04-content-platform.md`.

---

## Feature Structure

Every feature under `features/` contains:

```
features/<feature>/
  components/
  hooks/
  types/
  repositories/
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
- `repositories/` and `services/` almost always end up promoted to root, since progress, content, and purchases are consumed by multiple features — a feature-local `repositories/` or `services/` is the exception, not the default.

---

---

## Assets Folder

`assets/` holds UI assets only — icons, mascot artwork, illustrations, splash screens, fonts, and Lottie animation files — never educational content images, which are downloaded from Sanity and cached on the device filesystem instead (see `06-content-sync-engine.md`).

- WebP compressed.
- Multiple resolutions where appropriate.
