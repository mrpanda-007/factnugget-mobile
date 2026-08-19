# Phase 11B integrated validation

Phase 11B validates the local-first child experience, SQLite v4, Store-local entitlements,
Family bootstrap, durable outbox, Firestore transport, remote import, and two logical devices as
one system. It does not use a live Firebase project or a real Store account.

## Commands

Run the complete deterministic emulator suite:

```sh
npm run test:phase11b
```

`npm run test:e2e` runs the same E2E tests without rebuilding Functions first. Both commands use
the demo-only project `demo-factnuggets-phase11b`; attempts to reach non-emulated Firebase services
therefore fail closed. Firebase CLI 15 requires JDK 21 or newer. Set `JAVA_HOME` to an installed
JDK 21+ when the shell default is older.

The normal `npm test` command remains emulator-independent. It executes the local Phase 11B SQLite
tests and skips the emulator-only file unless `PHASE11B_EMULATOR_TEST=true` is set by `test:e2e`.

## Isolation and cleanup

- Each logical device receives a unique SQLite file in the operating system temporary directory.
- Tests close reopened connections and recursively remove their unique temporary directories.
- Firestore is cleared between emulator scenarios.
- Auth users use unique `example.test` email addresses; the Auth emulator is stopped after the run.
- Firebase applications and test environments are deleted after each scenario.
- The Store provider is a contract-level fake only inside tests. Production provider selection is
  unchanged.

## Covered integrated journeys

- Fresh schema-v4 local-only startup with no binding, outbox, entitlement, or active Explorer.
- Reveal versus explicit collect, shared-Discovery Pack context, resume state, Badge idempotency,
  settings persistence, and close/reopen durability through actual SQLite repositories.
- Successful purchase reconciliation into the SQLite entitlement cache, paid Pack guard behavior,
  and Store entitlement independence from Family account switching.
- Historical Backup Setup seeding with only approved educational entity references; local settings,
  active Explorer state, Auth data, and entitlements are excluded.
- Offline/failed push retention with attempt metadata, followed by normal retry semantics.
- Explicit A-to-B account replacement while old Family outbox rows remain under Family A, plus
  atomic replacement failure behavior.
- v3-to-v4 migration followed immediately by current binding/outbox runtime use, and injected v4
  migration rollback without database reset or silent deletion.
- Auth Emulator account creation, real Functions callable Family bootstrap/retry, actual Security
  Rules, SQLite Backup Setup, Firestore push, second-device remote Explorer import, no entitlement
  import, no import echo, and monotonic two-device convergence.

The existing focused suites remain part of the evidence for purchase cancel/pending/already-owned,
restore policies, malformed and unknown remote data, import rollback, merge ordering, Rules
privilege denial, Functions integrity behavior, release composition, and configuration failure
modes.

## Native and external limits

The Node E2E bridge implements only the Expo SQLite calls used by production repositories and runs
on Node's built-in SQLite. Android builds validate the native Expo SQLite dependency separately.
Native restart/reinstall/account-switch journeys require an attached Android emulator or device.
Real IAP requires configured Google Play or App Store products and accounts. Live Firebase, real
Store, iOS, and physical two-device validation remain Phase 11C/external follow-ups.
