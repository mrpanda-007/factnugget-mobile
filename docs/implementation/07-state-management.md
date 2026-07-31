# 07 — State Management

> Part of the Kids Discovery implementation specification.

---

## Three Layers

| Layer | Tool | Owns |
|---|---|---|
| Client state | Zustand | Ephemeral UI and session state |
| Server state | TanStack Query | Anything fetched from Firebase |
| Persistence | Expo SQLite | Offline cache and durable local data |

Keep these strictly separated.

---

## Zustand

Used for:

- Theme
- Child selection
- Active deck
- Current discovery
- Purchase state
- UI state

Rules:

- **Do not use Redux.**
- Keep stores small and feature-scoped.
- Never duplicate server state into Zustand.

---

## TanStack Query

Used **only** for:

- Firebase requests
- Content updates
- Purchase synchronization

Rules:

- Query keys are typed and centralized per feature.
- Loading, error, and retry states are handled at the query boundary — see `03-firebase.md`.
- The cache is the single source of truth for server data; components read from it, not from a mirrored store.

---

## Expo SQLite

Used for:

- Downloaded discoveries
- Categories
- Progress cache
- Settings cache
- Collections
- Offline support

Schema, migrations, and queries live in `database/`. See `08-offline-engine.md`.

---

## Decision Rule

When adding new state, ask in order:

1. Does it come from the server? → TanStack Query.
2. Must it survive app restart or work offline? → SQLite.
3. Otherwise → Zustand.

Never store the same fact in two of the three.
