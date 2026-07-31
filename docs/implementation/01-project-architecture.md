# 01 — Project Architecture

> Part of the Kids Discovery implementation specification.

---

## Project Goal

Build a premium cross-platform mobile application for children aged **5–8 years** that feels native on both iOS and Android while sharing a single TypeScript codebase.

The application must prioritize:

- Excellent performance
- Smooth animations
- Offline-first architecture
- Simple maintenance
- Scalability
- Beautiful UI
- Clean architecture

The application must be maintainable by a **solo developer**.

---

## Core Principles

The application should always be:

- Fast
- Offline-first
- Component-driven
- Type-safe
- Modular
- Testable
- Accessible
- Easy to extend

And must avoid:

- Unnecessary abstraction
- Overengineering
- Cleverness at the cost of readability

---

## Architectural Layers

```
UI (screens, components)
        ↓
Business logic (hooks, TanStack Query, Zustand)
        ↓
Repositories (stable data-access API — see Repositories Layer below)
        ↓
Services (AuthService, ContentService, PurchaseService, NotificationService, AnalyticsService, SyncService — see Service Layer below)
        ↓
Platform (Firebase SDK, Sanity CDN, StoreKit / Play Billing, Expo SQLite, filesystem)
```

This is the same chain named in `03-firebase.md` (`UI → Repositories → Services → Firebase`) and `04-content-platform.md` (`UI → Repositories → Content Service → SQLite → Sanity CDN`) — those documents assume the definitions below rather than repeating them.

Rules:

- Separate UI from business logic.
- Separate business logic from Firebase and Sanity.
- UI components never import the Firebase SDK or Sanity client directly — always go through a Repository, which calls a Service. See `03-firebase.md` and `04-content-platform.md`.

---

## Repositories Layer

Repositories are the single data-access API that hooks and TanStack Query call into. They exist to keep UI and business logic ignorant of *which* backend (Firebase, Sanity, StoreKit) or *which* cache (SQLite) is actually serving a piece of data.

Responsibilities:

- Expose one method per domain operation (e.g. `ProgressRepository.markDiscoveryComplete()`), not one per Firestore/Sanity document shape.
- Translate between the domain models the UI consumes and whatever shape a Service returns.
- Call Services only — a Repository never imports the Firebase SDK, the Sanity client, or a platform purchase API directly.
- Contain no platform-specific logic; that belongs in the Service it calls.

Relationship with Services: a Repository calls one or more Services and composes their results for a UI-facing use case. Services own the platform SDK calls; Repositories own the shape of data the app works with.

Relationship with TanStack Query: TanStack Query's query and mutation functions call Repository methods — the Repository is what a hook's `queryFn`/`mutationFn` invokes, and what gets mocked in tests. For SQLite-backed offline data that doesn't fit TanStack Query's server-cache model (e.g. reading cached content for immediate render), hooks may call a Repository directly.

Folder location: repositories are cross-cutting by default, since most domain concepts (progress, content, purchases) span multiple features. They live in the root `repositories/` folder (see `02-folder-structure.md`). A repository only belongs inside `features/<feature>/repositories/` if it is genuinely specific to that one feature — the same promotion rule used for every other feature folder.

---

## Service Layer

Services are the only modules permitted to call a platform SDK directly (Firebase, Sanity, StoreKit 2 / Play Billing, the filesystem). Each is a singleton module under `services/`.

| Service | Responsibility |
|---|---|
| `AuthService` | Firebase Authentication — anonymous sessions, email/Google/Apple sign-in, account linking. See `03-firebase.md`. |
| `ContentService` | Sanity CDN access, content synchronization, and the SQLite content cache. See `04-content-platform.md` and `06-content-sync-engine.md`. |
| `PurchaseService` | StoreKit 2 / Google Play Billing, entitlement resolution, Firestore purchase records. See `09-purchases.md`. |
| `NotificationService` | Local scheduled notifications (MVP) and Firebase Cloud Messaging (future). See `03-firebase.md#notifications`. |
| `AnalyticsService` | Firebase Analytics and Crashlytics event tracking, against the canonical event list in `03-firebase.md#analytics`. |
| `SyncService` | The offline write queue for user data (progress, collections, settings) synced to Firestore. See `08-offline-engine.md#offline-sync-queue`. |

Rule: a Repository may call any Service; a Service never calls another Service's platform SDK on its behalf — if two Services need the same data, that composition happens in a Repository.

---

## Data Ownership

| Data | Home | Notes |
|---|---|---|
| Educational content | Sanity CMS | Never in Firestore — see `04-content-platform.md` |
| Images | Sanity CDN | Downloaded and cached locally by the app, never bundled |
| User, children, progress, collections, purchases, settings | Firestore | User-specific only |
| Offline cache of all of the above | Expo SQLite | Source of truth while offline |
| Theme, child selection, active deck, UI state | Zustand | Ephemeral client state |

---

## Theme & Design Tokens

Use design tokens for everything visual. Tokens include:

- Primary colors
- Spacing
- Radius
- Typography
- Elevation
- Animation durations

Never hardcode a visual value in a component.

---

## Components

Build reusable components only. This is the canonical baseline set — `11-coding-standards.md` references it rather than restating it:

- `Button`
- `Card`
- `ProgressBar`
- `DiscoveryCard`
- `Sticker`
- `Avatar`
- `CategoryCard`
- `Badge`
- `SectionHeader`
- `ParentalGate` — required before any in-app purchase or external link; see `13-apple-kids-compliance.md`

Never duplicate UI. If a variation is needed, extend the existing component via props.

---

## Audio (Future)

Not implemented in MVP, but the architecture must accommodate it.

Each discovery includes:

- `narrationUrl`
- `narrationDuration`
- `transcript`

All nullable until narration exists. See `05-content-schema.md`.

---

## Push Notifications

Two channels, delivered by two different mechanisms — see `03-firebase.md#notifications` for the full split and rationale:

1. Child reminders — local scheduled notifications (MVP), no backend involved.
2. Parent progress — Firebase Cloud Messaging (future, requires Cloud Functions).

Notifications must always be configurable by the parent.

---

## Analytics

Track only meaningful events. The canonical event list and definitions live in `03-firebase.md#analytics` — this document does not restate it.

Do not collect unnecessary child information.

---

## Accessibility

- Large touch targets
- VoiceOver compatible
- Dynamic font support
- Readable contrast
- Screen reader labels on all interactive elements
