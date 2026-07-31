# 08 — Offline Engine

> Part of the Kids Discovery implementation specification.

---

## Requirement

The application must **launch and operate without internet**. Offline is the default assumption, not a fallback.

---

## What Must Work Offline

- Content
- Images
- Collections
- Progress
- Settings
- Category browsing
- Completing a discovery

---

## Local Storage

**Expo SQLite** stores:

- Downloaded discoveries and categories (synced from Sanity — see `06-content-sync-engine.md`)
- Progress cache
- Settings cache
- Collections

All schema, migrations, and query helpers live in `database/`.

---

## Why This Works

- Educational content is downloaded from Sanity and cached in SQLite + the local filesystem — see `06-content-sync-engine.md`.
- User data (progress, collections, settings) is cached in SQLite on every successful read/write against Firebase.

The network is only needed to **sync**, never to **read**.

---

## Synchronization

- Sync happens **automatically when internet returns**.
- Writes made offline are queued locally and replayed on reconnect.
- Conflicts resolve in favor of the most recent local user action for progress and collections.
- Sync failures must never block the UI or crash the app.

---

## Rules

- Never show a blocking spinner that depends on network availability for core flows.
- Never render an empty state simply because the device is offline.
- Every screen must be testable in airplane mode as part of the Definition of Done (`12-build-rules.md`).
