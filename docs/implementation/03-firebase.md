# 03 — Firebase

> Part of the Kids Discovery implementation specification.

---

# Purpose

Firebase is responsible for **user identity, cloud synchronization, purchases, notifications, analytics, and application services.**

Firebase is **not** responsible for educational content.

Educational content is managed through **Sanity CMS**.

---

# Scope

Only the following Firebase services are approved for this project.

## Firebase Authentication

Used for:

- Parent Accounts
- Anonymous Sessions
- Account Linking
- Google Sign In
- Sign in with Apple

---

## Firestore

Used for:

- Parent Profiles
- Child Profiles
- Learning Progress
- Sticker Collections
- Discovery Collections
- Purchased Products
- User Settings
- Notification Preferences
- Sync Metadata
- Feature Flags (optional)

Firestore must never store educational content.

---

## Firebase Cloud Messaging

Used for **remote, server-triggered notifications only**. Today's Discovery reminders are delivered on-device instead, with no Cloud Messaging involved — see [Notifications](#notifications) below for the full split and the reasoning.

Used for:

- Parent progress notifications *(future — requires [Cloud Functions](#cloud-functions))*
- Announcement notifications *(future)*

---

## Firebase Analytics

Used only for anonymous product analytics. See [Analytics](#analytics) below for the canonical event list — it is defined once, there.

Do not collect unnecessary personal information.

---

## Firebase Crashlytics

Used for:

- Crash Reporting
- Fatal Errors
- Performance Monitoring

Must be enabled for production builds.

---

## Firebase Storage

Reserved for future features.

Examples:

- User generated content
- Profile avatars
- Future downloadable assets

Educational assets should continue to be served through Sanity.

---

## Cloud Functions

Reserved for backend logic.

Future responsibilities include:

- Purchase Verification
- Notification Scheduling *(see [Notifications](#notifications) — this is what unlocks remote parent notifications)*
- Premium Entitlement Validation
- Weekly Progress Summaries
- Content Synchronization Tasks

Cloud Functions should not be introduced unless server-side logic is required.

---

# Authentication

Supported authentication providers:

- Anonymous
- Email & Password
- Google
- Apple

Requirements:

- Anonymous users can use the application immediately.
- Anonymous accounts must be upgradeable.
- Linking an anonymous account must preserve:
  - Child Profiles
  - Progress
  - Collections
  - Purchases
  - Settings

No user should ever lose data when creating an account.

---

# Firestore Data Model

The hierarchy follows the real-world ownership chain: one parent account owns multiple child profiles, and per-child data nests under the child it belongs to.

```
users/{userId}
  children/{childId}
    progress/{discoveryId}
    collections/{discoveryId}
    stickers/{stickerId}
  purchases/{purchaseId}
  settings
  notifications
  sync
```

| Path | Scope | Purpose |
|---|---|---|
| `users/{userId}` | Account | Parent account document — auth-linked profile |
| `users/{userId}/children/{childId}` | Child | Child profile — name, avatar, difficulty preference |
| `.../children/{childId}/progress/{discoveryId}` | Child | Per-discovery completion state |
| `.../children/{childId}/collections/{discoveryId}` | Child | Discoveries the child has unlocked — their card album |
| `.../children/{childId}/stickers/{stickerId}` | Child | Stickers earned as rewards |
| `users/{userId}/purchases/{purchaseId}` | Account | Purchase entitlements — see [Purchase Entitlements](#purchase-entitlements) |
| `users/{userId}/settings` | Account | Account-level settings (single document) |
| `users/{userId}/notifications` | Account | Notification preferences (single document) |
| `users/{userId}/sync` | Account | Sync metadata (single document) |

Scoping rules this hierarchy is built to support:

- **Purchases, settings, notification preferences, and sync metadata are account-level, not per-child** — an expansion pack unlocks for every child profile on the account (see [`09-purchases.md`](09-purchases.md)), and notification/settings choices are made by the parent, not the child.
- **`collections/` and `stickers/` are deliberately separate**, not duplicates: `collections/` records which discoveries a child has unlocked; `stickers/` records the distinct reward-sticker collectible earned alongside it.
- Nesting per-child data under `children/{childId}` means Firestore Security Rules can authorize with `request.auth.uid == userId` at the top of the path and inherit down through subcollections, without needing a redundant `childId` field on every document for rule matching.

Future collections should require architectural review.

---

# Firestore Responsibilities

Firestore stores only user-specific information.

Examples:

- Learning Progress
- Completed Discoveries
- Earned Stickers
- Purchased Expansion Packs
- Child Profiles
- Parent Preferences
- Notification Settings

Educational content, images, quizzes, narration, and discovery metadata belong in Sanity.

---

# Purchase Entitlements

Firestore is the source of truth for user entitlements after purchase verification.

Examples:

- Premium Access
- Purchased Discovery Packs
- Purchased Category Expansions
- Promotional Unlocks
- Early Access Users

The application should determine unlocked content from user entitlements rather than hardcoded logic. `PurchaseService` owns entitlement resolution — see [`01-project-architecture.md`](01-project-architecture.md#service-layer) and [`09-purchases.md`](09-purchases.md).

---

# Access Rules

Firebase must never be accessed directly from UI components.

Architecture:

UI

↓

Repositories

↓

Services

↓

Firebase

Only the service layer may communicate with the Firebase SDK.

Server state should be managed through TanStack Query.

Application state should be managed through Zustand.

Repository responsibilities, the Repository/Service split, and the concrete service modules (`AuthService`, `ContentService`, `PurchaseService`, `NotificationService`, `AnalyticsService`, `SyncService`) are defined once in [`01-project-architecture.md`](01-project-architecture.md#repositories-layer) — this document assumes that layering rather than repeating it.

---

# Error Handling

This is the canonical error-handling checklist for the project. [`11-coding-standards.md`](11-coding-standards.md) references this section rather than restating it.

Every Firebase operation must handle:

1. Loading state
2. Failure state
3. Retry
4. Offline mode
5. Friendly, age-appropriate error UI
6. Never crash the application

Offline-first behavior is mandatory.

---

# Synchronization

Firestore synchronization should occur automatically.

Synchronization includes:

- Progress
- Stickers
- Purchases
- Child Profiles
- Settings

The application should continue functioning while offline.

Pending changes should synchronize automatically when connectivity returns. The offline write queue that makes this possible is owned by `SyncService` and specified in [`08-offline-engine.md`](08-offline-engine.md#offline-sync-queue).

---

# Notifications

Notification delivery is split by whether it needs a backend trigger. This is a deliberate split, not an oversight: sending a Firebase Cloud Messaging push requires a server-side sender (Cloud Functions), which is future scope — so any notification needed for the MVP must not depend on it.

## Local Scheduled Notifications (Child) — MVP

Delivered entirely on-device. No backend, no Cloud Messaging, no Cloud Functions involved:

- Today's Discovery reminder
- Gentle reminders

Maximum frequency: one notification every two days.

This uses the same on-device notification tooling already required to *receive* Cloud Messaging pushes (see `00-tech-stack.md`) — scheduling a local notification is not a new dependency. Owned by `NotificationService` (see [`01-project-architecture.md`](01-project-architecture.md#service-layer)).

---

## Remote Notifications via Cloud Messaging (Parent) — Future

Deferred until [Cloud Functions](#cloud-functions) exists, since the client cannot trigger an FCM send on its own:

- Weekly learning summary
- Deck completed
- Sticker milestones
- Major achievements

All notifications — local and remote — must be configurable by the parent.

---

# Security

Requirements:

- Firestore Security Rules
- Authentication Rules
- Environment Variables
- No Secrets in Source Code
- App Check enabled for production

All Firebase access must be authenticated.

---

# Analytics

This is the canonical list of tracked analytics events for the whole project. [`01-project-architecture.md`](01-project-architecture.md) and [`09-purchases.md`](09-purchases.md) reference this table rather than restating it — add or rename an event here only.

Track only meaningful events:

| Event | Fires when |
|---|---|
| `App Open` | The application launches |
| `Category Viewed` | A child opens a category |
| `Deck Started` | A child opens a deck (its first discovery) |
| `Deck Completed` | A child finishes every discovery in a deck |
| `Discovery Viewed` | A child opens a discovery card |
| `Discovery Completed` | A child finishes a discovery (reward granted) |
| `Sticker Earned` | A sticker is awarded |
| `Expansion Purchased` | A purchase completes — base app, discovery pack, or category expansion (see [`09-purchases.md`](09-purchases.md)) |

`Discovery Viewed` / `Discovery Completed` and `Deck Started` / `Deck Completed` are intentionally distinct event pairs — viewing does not imply completion.

Analytics should prioritize product improvement while respecting children's privacy. Do not collect unnecessary personal information.

---
