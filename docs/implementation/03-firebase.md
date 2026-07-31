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

Used for:

- Parent Notifications
- Today's Discovery reminders
- Announcement notifications (future)

---

## Firebase Analytics

Used only for anonymous product analytics.

Examples:

- Category Opened
- Deck Started
- Deck Completed
- Discovery Viewed
- Sticker Earned
- Purchase Completed

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
- Notification Scheduling
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

# Firestore Collections

Examples:

users/

children/

progress/

collections/

stickers/

purchases/

notifications/

settings/

sync/

analytics/

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

The application should determine unlocked content from user entitlements rather than hardcoded logic.

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

---

# Error Handling

Every Firebase operation must:

- Handle loading states
- Handle retry
- Handle offline mode
- Display friendly errors
- Never crash the application

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

Pending changes should synchronize automatically when connectivity returns.

---

# Cloud Messaging

Notification types:

## Child

- Today's Discovery
- Gentle reminders

Maximum frequency:

One notification every two days.

---

## Parent

- Weekly learning summary
- Deck completed
- Sticker milestones
- Major achievements

All notifications must be configurable.

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

Track only meaningful events.

Examples:

- App Open
- Category Viewed
- Deck Started
- Deck Completed
- Discovery Completed
- Sticker Earned
- Purchase Completed

Analytics should prioritize product improvement while respecting children's privacy.

---
