# 06 — Content Sync Engine

> Part of the Kids Discovery implementation specification.

---

## Purpose

This document defines how content moves from Sanity into the local SQLite cache and asset store, and how the application keeps that cache current while remaining offline-first.

This is distinct from [`08-offline-engine.md`](08-offline-engine.md), which covers offline behavior for **user-generated data** (progress, collections, settings) synced with Firebase. This document covers offline behavior for **content** synced from Sanity.

---

## Image Download Strategy

The application should:

1. Download images only when needed.
2. Prefetch images for the currently selected deck.
3. Download purchased expansion assets immediately after purchase.
4. Cache images locally.
5. Reuse cached assets whenever possible.
6. Re-download only when image versions change.

Images should be requested in device-appropriate resolutions.

Never download unnecessarily large assets.

---

## Offline Content Engine

Downloaded content is stored locally using SQLite. Downloaded images are cached locally using the device filesystem.

After downloading, users should be able to access content without an internet connection.

Content that must work offline:

- Categories
- Decks
- Discoveries
- Images
- Stickers
- Previously downloaded expansion packs

Internet is only required, for content, to:

- Complete initial installation
- Download new or updated content
- Download purchased expansion packs

Progress synchronization and parent account synchronization are user-data concerns — see [`08-offline-engine.md`](08-offline-engine.md).

---

## Content Synchronization

Synchronization occurs automatically in the background. During synchronization the application compares local versions with the latest published versions.

```
Application Launch
    ↓
Read Local SQLite
    ↓
Display Cached Content
    ↓
Check Sanity
    ↓
Compare Versions
    ↓
Download Changes
    ↓
Update SQLite
    ↓
Refresh UI
```

Only changed content should be downloaded. The user should never wait for this to complete before using the application.

---

## Version Checking & Cache Invalidation

Every Category, Deck, Discovery, and Image includes a `version` field (see [`05-content-schema.md`](05-content-schema.md#content-versioning)).

The sync engine:

1. Reads the locally cached `version` for each document.
2. Compares it against the version published in Sanity.
3. Downloads only documents and images whose version has changed.
4. Writes the new version into SQLite once the download succeeds.

A download that fails or is interrupted must leave the previously cached version intact and valid — the cache is only updated after a successful write.

---

## Conflict Resolution

Content is read-only from the application's perspective — the app never writes content back to Sanity, so there are no write conflicts to resolve.

The only failure mode is a stale local cache, which is handled entirely by version comparison above. Sync failures must never block the UI or crash the app; the application continues serving the last known-good cached version until the next successful sync.

---

## Expansion Pack Delivery

```
Purchase
    ↓
Firebase confirms entitlement
    ↓
Content Service requests expansion metadata
    ↓
Download metadata
    ↓
Download images
    ↓
Store locally
    ↓
Unlock inside application
```

Expansion packs should never require an application update. Entitlement checks are defined in [`09-purchases.md`](09-purchases.md).

---

## Rules

- Never show a blocking spinner that depends on network availability for core content flows.
- Never render an empty state simply because the device is offline and content is already cached.
- Every content screen must be testable in airplane mode as part of the Definition of Done ([`12-build-rules.md`](12-build-rules.md)).
