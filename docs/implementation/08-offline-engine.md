# 08 — Offline Engine

> Phase 9B source-of-truth update. Cloud replication is not implemented yet.

## Requirement

The application launches and operates without internet. SQLite is the operational source of truth
for Explorer state, progress, badges, and device settings; the network is never required for child
exploration.

## Future optional cloud replication

Only a parent may opt into cloud replication. Local writes must commit to SQLite first and later
enqueue a durable SQLite V4 outbox operation. A sync worker will deliver the latest canonical record
as an idempotent upsert, retry retryable failures, and never block UI rendering.

Remote records will be strictly validated, merged through pure monotonic merge functions, and then
applied to SQLite. The cloud client cache is transport detail, not a replacement for SQLite. No
cloud-first write path, Firestore direct UI access, generic dirty flags, or deletion workflow exists
in the initial design.

## Outbox design for Phase 9D

`sync_outbox` will contain an operation ID, FamilyId, optional Explorer ID, approved entity type,
deterministic entity ID, `upsert`, creation time, retry count, last attempt time, and normalized
error code. It stores entity references rather than payload snapshots: progress is convergent state,
so delivery can serialize current SQLite state and safely collapse intermediate updates. A previous
family's outbox must be isolated before another account binds.

## Merge policy

Discovery and contextual pack discovery use earliest valid reveal/completion timestamps. Learning
pack progress uses earliest start, latest last view, and earliest completion with its matching
revision. Earned badges are permanent and use earliest earning with its matching revision. A
completion/collection lacking a reveal is repaired using its own event timestamp as the reveal
fallback; no arbitrary earlier timestamp is invented.

## Rules

- Never block core UI on network state.
- Never render empty child state merely because the device is offline.
- Never let remote data grant Store entitlements.
- Keep active Explorer selection and sound device-local.
