# 09 — Purchases

> Part of the Kids Discovery implementation specification.

---

## Platform Implementation

Use **native platform purchases** only.

| Platform | Technology          |
| -------- | ------------------- |
| iOS      | StoreKit 2          |
| Android  | Google Play Billing |

No third-party purchase abstraction layers.

---

## Products

- **Base App**
- **Discovery Packs**
- **Category Expansions**
- **Restore Purchases**

Launch pricing is controlled by **feature flags**.

---

## State

- Purchase state lives in Zustand (`07-state-management.md`).
- Purchase **synchronization** goes through TanStack Query, via `PurchaseService` (`01-project-architecture.md#service-layer`).
- Entitlements are cached in SQLite so purchased content remains accessible offline.

---

## Cloud policy

Apple and Google Store current ownership is the authority. The local SQLite entitlement cache is
derived from Store reconciliation and feeds the EntitlementRepository access decision. Phase 9 cloud
replication does not create purchase, receipt, ownership, or access-granting entitlement records;
Firestore must never unlock content independently. Restore Purchases remains a Store operation, not
cloud synchronization.

---

## Analytics

Track `Expansion Purchased` — the canonical event definition lives in `03-firebase.md#analytics`. Do not track anything that identifies the child.

---

## Testing

> Critical purchase flows must **always** be tested.

Required coverage:

- Successful purchase
- Cancelled purchase
- Failed / interrupted purchase
- Restore purchases
- Entitlement available offline
- Feature-flagged pricing variants
