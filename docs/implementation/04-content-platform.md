# 04 — Content Platform

> Part of the Kids Discovery implementation specification.

---

## Purpose

The Content Platform is responsible for delivering all educational content to the application.

Educational content is completely independent from the application codebase.

The application should be capable of receiving new content without requiring an App Store or Play Store update.

The Content Platform consists of:

- Sanity CMS
- Content Delivery API
- Local SQLite Cache
- Local Asset Cache
- Content Synchronization Engine

The application must always prioritize locally cached content to ensure an offline-first experience.

This document covers the overall architecture, content hierarchy, publishing workflow, and synchronization model. For detailed document field definitions, see [`05-content-schema.md`](05-content-schema.md). For offline caching, image download, and sync mechanics, see [`06-content-sync-engine.md`](06-content-sync-engine.md).

---

## Architecture

```
Educational Team
        ↓
Claude AI
        ↓
Content Review
        ↓
Sanity CMS
        ↓
Sanity CDN
        ↓
Content Service
        ↓
SQLite + Local Asset Cache
        ↓
Application UI
```

The UI must never communicate directly with Sanity.

All content access must go through the Content Service layer.

---

## Responsibilities

### Sanity CMS

Sanity is the source of truth for all educational content.

Sanity manages:

- Categories
- Decks
- Discoveries
- Discovery Images
- Discovery Metadata
- Difficulty Variants
- Expansion Packs
- Sticker Metadata
- Future Narration
- Future Quizzes
- Featured Content
- Display Order
- Version History
- Publishing Workflow

Sanity must never store:

- Users
- Progress
- Purchases
- Child Profiles
- Collections
- Analytics
- Notification Settings

Optional parent-account cloud replication may hold pseudonymous educational state; Stores remain the
authority for purchases and Phase 9C implements Auth only, not cloud replication. See [`03-firebase.md`](03-firebase.md).

---

## Content Hierarchy

The application uses the following hierarchy:

```
Category
    ↓
Deck
    ↓
Discoveries
```

Example:

```
Dinosaurs
    ↓
Meet the Dinosaurs
    ↓
20 Discoveries
```

Future expansion:

```
Dinosaurs
├── Meet the Dinosaurs
├── Mighty Predators
├── Gentle Giants
└── Baby Dinosaurs
```

This hierarchy allows unlimited future expansion without changing the application architecture.

Field-level definitions for each document type in this hierarchy live in [`05-content-schema.md`](05-content-schema.md).

---

## Publishing Workflow

Every content update follows this workflow:

```
Content Idea
    ↓
Claude AI Draft
    ↓
Manual Review
    ↓
Fact Verification
    ↓
Image Creation
    ↓
Editorial Approval
    ↓
Publish to Sanity
    ↓
Version Increment
    ↓
Application detects update
    ↓
Background Download
    ↓
Ready Offline
```

Publishing educational content must never require an application release.

---

## Content Synchronization (Overview)

Synchronization happens automatically in the background: the app displays cached content immediately, checks Sanity for changes, and downloads only what changed. The user should never wait for content synchronization before using the application.

The full sync flow, manifest/delta strategy, version comparison, image download strategy, and cache invalidation are defined once in [`06-content-sync-engine.md`](06-content-sync-engine.md) — this document intentionally doesn't repeat the diagram, to avoid the two drifting apart.

---

## Expansion Packs

Expansion Packs are delivered entirely through the Content Platform: a confirmed Firebase entitlement triggers the Content Service to fetch and cache the pack's metadata and images, then unlock it inside the application.

Expansion packs should never require an application update. Entitlement handling is defined in [`09-purchases.md`](09-purchases.md); the full delivery sequence and caching mechanics are defined once in [`06-content-sync-engine.md#expansion-pack-delivery`](06-content-sync-engine.md#expansion-pack-delivery).

---

## Content Service

The UI must never communicate directly with Sanity.

Instead, all content must flow through the Content Service.

```
UI
    ↓
ContentRepository
    ↓
ContentService
    ↓
SQLite Cache
    ↓
Sanity CDN
```

`ContentRepository` and `ContentService` are defined in [`01-project-architecture.md`](01-project-architecture.md#repositories-layer). The Content Service is responsible for:

- Fetching Categories
- Fetching Decks
- Fetching Discoveries
- Downloading Images
- Cache Management
- Version Checking
- Synchronization
- Offline Retrieval

The UI should never know whether content came from the internet or local storage.

---

## Content Rules

- Educational content must never be stored in Firestore.
- Educational content must never be hardcoded into application screens.
- Every Discovery should be editable through Sanity.
- Content updates should not require a new mobile application release.
- Every schema change must include:
  - Updated TypeScript types
  - Migration documentation
  - Version increment
  - Backward compatibility review

The Content Platform should scale to:

- Thousands of Discoveries
- Hundreds of Decks
- Unlimited Categories
- Multiple Languages
- Narration
- Interactive Quizzes
- Seasonal Content
- Limited-Time Discovery Packs
- Personalized Learning Paths

The application architecture should remain unchanged as the content library grows.
