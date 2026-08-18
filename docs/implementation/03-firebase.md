# 03 — Optional Parent Accounts and Cloud Replication

> Phase 9F adds privileged Family bootstrap and parent-controlled Backup & Sync over the SQLite V4 binding/outbox foundation.

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

An authenticated parent can remain intentionally **unbound**. Auth UID is not FamilyId, and signing in
never creates a Family automatically. A parent explicitly sets up Backup & Sync (new account), or
explicitly elects to add this device's local Explorers after an existing Family is found. Auth success,
Family creation, and sync completion are separate states.

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

## Firestore structure

```text
families/{familyId}
  members/{authUserId}
  explorers/{explorerId}
    discoveryProgress/{discoveryId}
    packDiscoveryProgress/{learningPackId__discoveryId}
    learningPackProgress/{learningPackId}
    badges/{worldId}

accountFamilyIndex/{authUserId}  (server-only lookup, never client-readable)
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

SQLite V4 provides `cloud_account_binding` (one explicit device-local family context) and a durable
`sync_outbox`. A bound local write commits the canonical state and its family-scoped entity-reference
`upsert` in the same SQLite transaction. The outbox never snapshots DTO payloads: delivery
re-reads the latest canonical SQLite state, then performs a Firestore read/merge/write transaction
using the same pure merge functions as pull. This safely coalesces convergent progress writes and
avoids Firestore last-write-wins losing educational state. Successful remote writes alone acknowledge
outbox entries. It has no delete operation, entitlement data, Store data, or device settings.

Firestore uses an in-memory transport cache only. SQLite remains the operational database; screens
never read Firestore directly, no realtime listeners are installed, and sync is explicit rather than
an app-startup requirement. Remote merges write SQLite directly without enqueueing echo operations.

## Secure Family bootstrap

`functions/` is a server-only Node 22 Cloud Functions workspace. Two 2nd-generation HTTPS callable
Functions, `getMyFamilyStatus` and `createMyFamily`, derive the user exclusively from verified callable
Auth context. The Admin SDK creates `families/{familyId}`, its `{authUserId}` parent membership, and
`accountFamilyIndex/{authUserId}` in one Firestore transaction. The FamilyId is a server-generated UUID,
independent of the Auth UID. Repeated or concurrent create calls revalidate and return the same canonical
Family. Mobile Firestore Rules continue to deny all membership and index writes; mobile code calls only
the project-owned bootstrap repository and never imports the Admin SDK.

Functions emulator use is explicit and development-only, alongside Auth and Firestore. The live deployment
region must be selected as part of the Firebase environment plan, then supplied consistently to Functions
and the mobile client; no live project is assumed by this repository.

## Guest, sign-out, and account switching policy

Creating a new parent account can explicitly create a Family, preserves every existing Explorer UUID,
binds local state, and queues every locally persisted Explorer, DiscoveryProgress,
PackDiscoveryProgress, LearningPackProgress, and EarnedBadge. Binding and this historical
entity-reference seed occur in one SQLite transaction; entitlements, receipts, purchases, active Explorer,
sound setting, Auth session, and diagnostics are never seeded. After commit, push runs first and then each
already-local Explorer UUID is pulled. “Up to date” means the sync succeeded and this Family has no pending
outbox rows.

Signing into an existing family must never silently merge local child state. The parent chooses to add
local Explorers as distinct records or keep the data local and unbound. Different
Explorer UUIDs are always distinct; matching by look, progress, time, or a future name is forbidden.

Sign-out retains the local binding, outbox, SQLite data, and child exploration; cloud delivery pauses until
the linked parent signs in again. A different parent session is detected as an account mismatch and cannot
reassign queued rows, detach, or merge. Explicit account switching and remote-Explorer import remain Phase 9G.

## Account switching and Explorer recovery

Phase 9G makes switching an explicit parent-only management flow. It first resolves the authenticated
target account through the server-managed callable index, then replaces the SQLite binding with a single
conditional update only after confirmation. Rows in `sync_outbox` keep their original FamilyId forever;
switching never reassigns or discards old-family work. A target account with no Family requires explicit
Family setup, followed by an explicit choice to connect only, add this device's local Explorers, or import
an existing remote Explorer.

Remote Explorer recovery is also explicit and parent-only. The normal Firestore client lists only the
current Family's validated Explorer summaries, reads a selected full snapshot, validates all DTOs, and
applies the Explorer plus educational state in one SQLite transaction without enqueuing an echo write.
The cloud UUID is used as the local Explorer UUID. A same UUID merges monotonic progress; a different UUID
is a separate Explorer. Imported educational progress never grants Store entitlement. Explorer look changes
still do not have conflict metadata, so existing-local appearance wins for a same-UUID import.

## Purchases and entitlements

Apple and Google Stores are the authority for purchase transactions and current ownership.
`local_entitlements` is a derived SQLite cache, and the EntitlementRepository is the application
access-decision boundary. Firestore must not independently grant Store-purchased access, including
cross-platform access. Apple ownership does not automatically unlock Android, and Google ownership
does not automatically unlock iOS; same-platform Store Restore remains separate from cloud sync.
Future server verification may strengthen trusted Store evidence but does not change this authority.

## Security and environments

`firestore.rules` is default-deny: every family path requires authenticated membership, validates
allowed document fields/IDs/schema version, and denies deletes. Mobile clients cannot create families,
membership documents, or server index documents, preventing self-enrollment. The server-only callable
bootstrap is the authorization boundary. Emulator rules tests seed fixtures with Rules disabled only in
Node test tooling.

Use separate Firebase development, staging, and production projects; never use production family
data for testing. `firebase.json` configures local Auth/Firestore/Functions emulators and client emulator use
requires both `__DEV__` and explicit environment configuration. App Check is planned before
production enforcement, after the core flow works. Analytics, Crashlytics, FCM, and notifications
are out of scope for Phase 9.
