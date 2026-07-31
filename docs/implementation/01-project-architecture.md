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
Business logic (hooks, feature services)
        ↓
Data access (TanStack Query, SQLite, Firebase adapters, Content Service)
        ↓
Platform (Firebase SDK, Sanity CDN, StoreKit / Play Billing, filesystem)
```

Rules:

- Separate UI from business logic.
- Separate business logic from Firebase and Sanity.
- UI components never import the Firebase SDK or Sanity client directly — always go through a service. See `03-firebase.md` and `04-content-platform.md`.

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

Build reusable components only. Baseline set:

- `Button`
- `Card`
- `ProgressBar`
- `DiscoveryCard`
- `Sticker`
- `Avatar`
- `CategoryCard`
- `Badge`
- `SectionHeader`

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

Firebase Cloud Messaging, with **two channels**:

1. Child reminders
2. Parent progress

Notifications must always be configurable by the parent.

---

## Analytics

Track only meaningful events:

- Discovery Completed
- Deck Finished
- Sticker Earned
- Expansion Purchased
- Category Viewed

Do not collect unnecessary child information.

---

## Accessibility

- Large touch targets
- VoiceOver compatible
- Dynamic font support
- Readable contrast
- Screen reader labels on all interactive elements
