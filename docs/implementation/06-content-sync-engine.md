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

Synchronization occurs automatically in the background and is **manifest-based**, so the app never has to re-fetch the full content library just to detect changes.

```
Application Launch
    ↓
Read Local SQLite
    ↓
Display Cached Content
    ↓
Fetch Manifest
    ↓
Diff Manifest Against Local Versions
    ↓
Download Changed Documents + Images (delta only)
    ↓
Update SQLite + Image Cache
    ↓
Refresh UI
```

### Manifest

Each sync check fetches one lightweight manifest from Sanity containing `{ id, version }` for every Category, Deck, Discovery, and Image — not the full documents. This keeps the "has anything changed" request cheap and roughly constant-sized as the catalog grows, instead of scaling with total content volume.

### Delta Updates

The manifest is diffed against the versions already cached in SQLite (see [Version Checking & Cache Invalidation](#version-checking--cache-invalidation)). Only documents whose version changed are downloaded — new or edited Discoveries, not the whole catalog. Unpublished content is left in the local cache as-is; removing something from Sanity does not force a client-side deletion or an app update.

### Asset Updates

Images follow the same delta principle as [Image Download Strategy](#image-download-strategy) above: only images whose version changed are re-downloaded, and only for content the user has reached or is about to reach.

### SQLite + Image Cache Updates

Downloaded documents and images are written to SQLite / the filesystem cache only after a successful download (see below). Downloading the entire content library after every change is a hard non-goal, not just an optimization — this matters once the catalog reaches the "thousands of Discoveries" scale described in [`04-content-platform.md#content-rules`](04-content-platform.md#content-rules).

The user should never wait for any of this to complete before using the application.

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

## Cache Strategy

Version checking above keeps the cache _correct_; this section governs its _size_.

- **No fixed cache quota for MVP.** The initial catalog (100 Discoveries across 5 categories) is small enough that eviction machinery isn't needed yet. This must be revisited before the catalog grows toward the "thousands of Discoveries" goal in [`04-content-platform.md#content-rules`](04-content-platform.md#content-rules) — at that scale a quota and eviction policy become mandatory.
- **Eviction policy, once a quota exists:** evict least-recently-viewed images for content the child does not own and hasn't opened recently. Never silently evict content the user has purchased.
- **Downloaded expansion packs are exempt from automatic eviction.** A purchased pack stays available offline until the user explicitly clears it — this is what "Entitlement available offline" in [`09-purchases.md`](09-purchases.md) depends on.
- **Language assets:** only the device's active language is cached by default. Switching languages triggers a fresh delta download for that language rather than caching every language at once.
- **Future narration assets:** audio files are far larger than images. When narration ships, it is cached separately from images with its own version check (using the existing `narrationUrl` / `narrationDuration` fields — see [`05-content-schema.md`](05-content-schema.md#audio-future-narration)), and defaults to on-demand download rather than deck-level prefetch.
- **User-controlled cache clearing:** the parent zone must expose a "Free up space" action that clears cached images and re-downloadable content. It must never remove progress, stickers, or purchase entitlements — those are user data, not content cache (see [`08-offline-engine.md`](08-offline-engine.md)). Content simply re-downloads on next use after clearing.

This keeps MVP scope minimal — no eviction logic ships yet — while giving the sync engine a documented point to extend from later, per the "avoid overengineering" principle in [`01-project-architecture.md`](01-project-architecture.md).

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
