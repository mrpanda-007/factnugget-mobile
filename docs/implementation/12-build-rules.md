# 12 — Build Rules

> Part of the Kids Discovery implementation specification.
> This document governs **how work is done**. It takes precedence over convenience.

---

## Build Process

- Implement features in **vertical slices**.
- **Never scaffold the entire application first.**
- Each phase must produce a **working application**.

A vertical slice means: UI + logic + data + offline + tests for one user-visible capability, end to end.

## Android release builds

The generated `android/` project is not committed. `app.json` and the local
`withAndroidReleaseSigning` Expo config plugin are the reproducible sources of
truth for the Android application ID and release signing configuration.

For local release compile validation without a real signing key:

```sh
FACTNUGGETS_ANDROID_ALLOW_UNSIGNED_RELEASE=true ./gradlew :app:assembleRelease
```

Run that command from `android/`. It produces an explicitly unsigned validation
artifact and must never be distributed. Without that opt-in, release tasks fail
closed unless all four signing values are supplied through CI environment
variables or untracked user-level Gradle properties:

- `FACTNUGGETS_ANDROID_KEYSTORE_PATH`
- `FACTNUGGETS_ANDROID_KEYSTORE_PASSWORD`
- `FACTNUGGETS_ANDROID_KEY_ALIAS`
- `FACTNUGGETS_ANDROID_KEY_PASSWORD`

The keystore path may be machine-specific only in external configuration; no
keystore or credential belongs in the repository or an `EXPO_PUBLIC_*`
variable. A production signed APK or AAB uses the normal `assembleRelease` or
`bundleRelease` task after all four values are securely injected. The real
production/upload key is not configured in source control.

For Google Play, use Play App Signing: Google retains the Play signing key and
the externally managed upload key signs uploads. EAS Build may manage the upload
key later, or CI may inject the same four values above.

---

## Definition of Done

A feature is complete only if:

- [ ] UI implemented
- [ ] Animations complete
- [ ] Offline supported
- [ ] Responsive
- [ ] Accessibility checked
- [ ] Types added
- [ ] Tests written
- [ ] No lint errors
- [ ] No TypeScript errors
- [ ] Documentation updated

Anything less is not done.

---

## AI Rules

Claude Code must:

- **Never invent architecture.**
- **Never introduce unnecessary libraries.**
- **Never replace existing patterns.**
- **Always reuse existing components.**
- **Always follow this specification.**

If an implementation conflicts with this specification, **this specification takes precedence**.

When uncertain, **ask for clarification rather than making assumptions**.

---

## Document Index

| File                          | Covers                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| `00-tech-stack.md`            | Approved technologies and versions                                      |
| `01-project-architecture.md`  | Goal, principles, layers, Repositories/Service layer, theme, components |
| `02-folder-structure.md`      | Root and feature folder layout                                          |
| `03-firebase.md`              | Auth, Firestore data model, notifications, analytics, security          |
| `04-content-platform.md`      | Content architecture, hierarchy, publishing workflow                    |
| `05-content-schema.md`        | Sanity document field definitions                                       |
| `06-content-sync-engine.md`   | Content caching, manifest/delta sync, image download, cache strategy    |
| `07-state-management.md`      | Zustand / TanStack Query / SQLite split                                 |
| `08-offline-engine.md`        | Offline requirements, offline sync queue, sync for user data            |
| `09-purchases.md`             | StoreKit 2, Play Billing, entitlements                                  |
| `10-performance.md`           | 60 FPS targets and techniques                                           |
| `11-coding-standards.md`      | TypeScript, style, testing, security                                    |
| `12-build-rules.md`           | Process, Definition of Done, AI rules                                   |
| `13-apple-kids-compliance.md` | Apple Kids Category requirements                                        |

Read the relevant document **before** writing any code.

This index is the complete list of authoritative documents for engineering architecture. `docs/archive/` may contain superseded drafts (e.g. the pre-split monolithic spec) kept for historical reference only — anything there is never authoritative and must never be read for implementation guidance, even if it appears to cover the same topic as a document above.

`docs/design/` is a sibling specification, equally authoritative, for visual/UX decisions: color, typography, spacing, motion, component architecture, screen map, and asset strategy. Read it alongside this index — `01-project-architecture.md#theme--design-tokens` and `#components` defer to it rather than restating its contents.
