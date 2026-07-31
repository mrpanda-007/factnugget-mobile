# 00 — Tech Stack

> Part of the Kids Discovery implementation specification.
> This document defines **what technologies are used**. Architectural reasoning lives in `01-project-architecture.md`.

---

## Platform

| Concern           | Choice              |
| ----------------- | ------------------- |
| Framework         | React Native        |
| Tooling / runtime | Expo                |
| Language          | TypeScript (strict) |

Always use the **latest stable** versions.

---

## Styling

- **NativeWind**
- **Tailwind CSS**

Rules:

- Design tokens must be used.
- No inline colors.
- No hardcoded spacing.

---

## Animations

- **React Native Reanimated**
- **React Native Gesture Handler**
- **Lottie**

Rules:

- Use native (UI-thread) animations whenever possible.
- Do not add additional animation libraries.

---

## Navigation

- **React Navigation**
  - Bottom Tabs
  - Native Stack

Rules:

- Typed navigation only. No untyped `navigate()` calls.

---

## State

| Layer             | Library        |
| ----------------- | -------------- |
| Client state      | Zustand        |
| Server state      | TanStack Query |
| Local persistence | Expo SQLite    |

Redux is not used. See `07-state-management.md`.

---

## Backend

**Firebase**, limited to:

- Authentication
- Firestore
- Cloud Messaging
- Analytics
- Crashlytics
- Storage _(future)_
- Cloud Functions _(future)_

See `03-firebase.md`.

---

## Purchases

| Platform | Technology          |
| -------- | ------------------- |
| iOS      | StoreKit 2          |
| Android  | Google Play Billing |

See `09-purchases.md`.

---

## Library Policy

- Never introduce a library not listed in this document.
- If a new dependency seems necessary, ask for clarification first.
- Prefer platform/native capability over a third-party package.
