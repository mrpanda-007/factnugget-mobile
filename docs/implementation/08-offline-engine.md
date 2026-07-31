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
- Writes made offline are queued locally and replayed on reconnect — see [Offline Sync Queue](#offline-sync-queue) below for the mechanism.
- Conflicts resolve in favor of the most recent local user action for progress and collections.
- Sync failures must never block the UI or crash the app.

---

## Offline Sync Queue

This is what "writes are queued locally and replayed on reconnect" (above) actually consists of.

**Purpose:** buffer writes to user data (progress, collections, settings) made while offline, so nothing is lost before Firestore is reachable again.

**Queue model:** a single append-only SQLite table in `database/`, alongside the rest of the schema (see [`02-folder-structure.md`](02-folder-structure.md)) — one row per pending write:

| Field | Purpose |
|---|---|
| `id` | Local queue entry id |
| `path` | Target Firestore path — see [`03-firebase.md#firestore-data-model`](03-firebase.md#firestore-data-model) |
| `operation` | `set` \| `update` |
| `payload` | The write payload |
| `createdAt` | Ordering and conflict resolution |
| `retryCount` | Backoff |

This is a flat queue, not a general event log — a single child's data on a single device doesn't need operational-transform or CRDT-level machinery, and adding it now would be overengineering.

**Retry behavior:** on reconnect, `SyncService` drains the queue oldest-first, retrying failed writes with backoff. A write that keeps failing stays in the queue — it is never silently dropped — and is surfaced through Crashlytics rather than blocking the UI.

**Conflict resolution:** last-write-wins by `createdAt`, favoring the most recent local action for progress and collections (as stated above). This is sufficient because the MVP has no concurrent-multi-device-editing scenario for a single child; revisit only if that becomes a real requirement.

**Ownership:** `SyncService` (see [`01-project-architecture.md#service-layer`](01-project-architecture.md#service-layer)) owns draining and replaying the queue. Repositories enqueue a write through `SyncService` when a Firestore write fails while offline — they never touch the queue table directly.

**Storage location:** `database/`, next to the rest of the SQLite schema. No separate `sync/` folder is needed for this.

---

## Rules

- Never show a blocking spinner that depends on network availability for core flows.
- Never render an empty state simply because the device is offline.
- Every screen must be testable in airplane mode as part of the Definition of Done (`12-build-rules.md`).
