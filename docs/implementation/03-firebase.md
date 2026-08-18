# 03 — Optional Parent Accounts and Cloud Replication

> Phase 9C implements optional parent email/password Auth only. Firestore sync is not implemented.

## Purpose and scope

Firebase is optional. The app remains fully usable forever as a local guest experience.
Firebase Authentication will represent a **parent**, never a child Explorer. Firebase
Anonymous Auth, Google, Apple, and email-link sign-in are not part of the initial flow.
Phase 9C uses Firebase JavaScript SDK, email/password, password reset, and explicit React Native
AsyncStorage-backed Auth persistence. Firebase config is environment-based and optional: if absent,
the app remains local-only and Parent Auth is explicitly unavailable.

Cloud replication is for educational state recovery across devices. It does not replace
SQLite, Sanity, or the Stores. Screens must use application services, which use project-owned
repository contracts; screens never access Firebase or Firestore directly.

An authenticated parent is intentionally **unbound** in Phase 9C: Auth UID is not FamilyId, no
Family record is created, and no Explorer/progress state is uploaded. Parent account connection is
not a backup or sync completion signal.

## Source-of-truth matrix

| Data                                   | Operational authority      | Cloud role                           |
| -------------------------------------- | -------------------------- | ------------------------------------ |
| Parent Auth identity                   | Firebase Auth              | Optional parent session              |
| Family identity                        | Family domain record       | Firestore replication                |
| Explorer identity                      | SQLite                     | Replicated with immutable local UUID |
| Active Explorer selection              | SQLite device settings     | Never synced                         |
| DiscoveryProgress                      | SQLite                     | Monotonic replication                |
| PackDiscoveryProgress                  | SQLite                     | Monotonic replication                |
| LearningPackProgress                   | SQLite                     | Field-aware replication              |
| EarnedBadge                            | SQLite                     | Monotonic replication                |
| Sound setting                          | SQLite device settings     | Never synced                         |
| Educational content                    | Sanity/content repository  | Never in Firestore                   |
| Store product metadata                 | Apple/Google provider      | Never authoritative in Firestore     |
| Purchase transaction/current ownership | Apple/Google Store         | Never in Firestore authority         |
| Local entitlement cache                | Store-derived SQLite state | Never grants access from cloud data  |

## Identity and privacy model

`FamilyId` is an opaque UUID independent of a Firebase Auth UID. Existing Explorer UUIDs
remain their cloud identity. A family has parent memberships so the model can support future
co-parents without making a child identity an Auth account. Cloud Explorers contain only an ID,
cosmetic look, and timestamps—never a name, birth date, photo, email, location, or content payload.

## Proposed Firestore structure

This is a Phase 9E target only; no collection exists yet.

```text
families/{familyId}
  members/{authUserId}
  explorers/{explorerId}
    discoveryProgress/{discoveryId}
    packDiscoveryProgress/{learningPackId__discoveryId}
    learningPackProgress/{learningPackId}
    badges/{worldId}
```

All IDs are canonical typed IDs. Content IDs exclude underscores, making `__` a deterministic,
unambiguous pack-discovery delimiter. Path construction belongs in typed cloud path helpers, never
in screens.

## Local-first synchronization

The future local write path is:

```text
UI → application service → SQLite → durable SQLite outbox → asynchronous cloud replication
```

The future remote path is:

```text
cloud DTO → strict validation → pure merge → SQLite → normal UI refresh
```

Event timestamps record reveal, collection, completion, earning, and last view. Transport/sync
timestamps must never overwrite those events. Discovery and pack-discovery fields use earliest
valid timestamps; learning-pack start uses earliest, last view uses latest, and completion/badge
revisions stay paired with the accepted earliest completion/earning. Firestore last-write-wins is
not sufficient for these rules.

Phase 9D will add a SQLite V4 `cloud_account_binding` and a durable `sync_outbox`. The preferred
outbox stores a family-scoped entity reference and `upsert` operation, then serializes the latest
canonical SQLite state at delivery. That is appropriate because progress replication is convergent
state, not an event log. Initial sync has no delete operation.

## Guest, sign-out, and account switching policy

Creating a new parent account creates a FamilyId later, preserves every existing Explorer UUID,
binds local state, queues its syncable records, and leaves SQLite operationally unchanged.

Signing into an existing family must never silently merge local child state. The parent must later
choose to import local Explorers as distinct records or keep the data local and unbound. Different
Explorer UUIDs are always distinct; matching by look, progress, time, or a future name is forbidden.

Sign-out ends the Auth session and stops sync but retains SQLite data and child exploration. Before
another account/family can bind, the previous family context and outbox must be isolated so no write
can be delivered to the new family. Account switching is high risk and requires an explicit future
import/bind decision.

## Purchases and entitlements

Apple and Google Stores are the authority for purchase transactions and current ownership.
`local_entitlements` is a derived SQLite cache, and the EntitlementRepository is the application
access-decision boundary. Firestore must not independently grant Store-purchased access, including
cross-platform access. Apple ownership does not automatically unlock Android, and Google ownership
does not automatically unlock iOS; same-platform Store Restore remains separate from cloud sync.
Future server verification may strengthen trusted Store evidence but does not change this authority.

## Security and environments

Phase 9E security rules must require Auth, verify family membership and family isolation, restrict
Explorer subtrees to members, validate deterministic path/record IDs, field allowlists, and
`schemaVersion`, and deny entitlement purchase-authority documents and cross-family access.

Use separate Firebase development, staging, and production projects; never use production family
data for testing. Firebase Emulator Suite is required for Auth, Firestore, and rule development
before production-ready sync. App Check is planned before production enforcement, after the core
flow works. Analytics, Crashlytics, FCM, and notifications are out of scope for Phase 9.
