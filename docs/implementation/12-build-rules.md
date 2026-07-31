# 12 — Build Rules

> Part of the Kids Discovery implementation specification.
> This document governs **how work is done**. It takes precedence over convenience.

---

## Build Process

- Implement features in **vertical slices**.
- **Never scaffold the entire application first.**
- Each phase must produce a **working application**.

A vertical slice means: UI + logic + data + offline + tests for one user-visible capability, end to end.

---

## Definition of Done

A feature is complete only if:

- [ ] UI implemented
- [ ] Animations complete
- [ ] Offline supported
- [ ] Responsive
- [ ] Accessibility checked
- [ ] Types added
- [ ] Tests written
- [ ] No lint errors
- [ ] No TypeScript errors
- [ ] Documentation updated

Anything less is not done.

---

## AI Rules

Claude Code must:

- **Never invent architecture.**
- **Never introduce unnecessary libraries.**
- **Never replace existing patterns.**
- **Always reuse existing components.**
- **Always follow this specification.**

If an implementation conflicts with this specification, **this specification takes precedence**.

When uncertain, **ask for clarification rather than making assumptions**.

---

## Document Index

| File                          | Covers                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| `00-tech-stack.md`            | Approved technologies and versions                                      |
| `01-project-architecture.md`  | Goal, principles, layers, Repositories/Service layer, theme, components |
| `02-folder-structure.md`      | Root and feature folder layout                                          |
| `03-firebase.md`              | Auth, Firestore data model, notifications, analytics, security          |
| `04-content-platform.md`      | Content architecture, hierarchy, publishing workflow                    |
| `05-content-schema.md`        | Sanity document field definitions                                       |
| `06-content-sync-engine.md`   | Content caching, manifest/delta sync, image download, cache strategy    |
| `07-state-management.md`      | Zustand / TanStack Query / SQLite split                                 |
| `08-offline-engine.md`        | Offline requirements, offline sync queue, sync for user data            |
| `09-purchases.md`             | StoreKit 2, Play Billing, entitlements                                  |
| `10-performance.md`           | 60 FPS targets and techniques                                           |
| `11-coding-standards.md`      | TypeScript, style, testing, security                                    |
| `12-build-rules.md`           | Process, Definition of Done, AI rules                                   |
| `13-apple-kids-compliance.md` | Apple Kids Category requirements                                        |

Read the relevant document **before** writing any code.

This index is the complete list of authoritative documents for engineering architecture. `docs/archive/` may contain superseded drafts (e.g. the pre-split monolithic spec) kept for historical reference only — anything there is never authoritative and must never be read for implementation guidance, even if it appears to cover the same topic as a document above.

`docs/design/` is a sibling specification, equally authoritative, for visual/UX decisions: color, typography, spacing, motion, component architecture, screen map, and asset strategy. Read it alongside this index — `01-project-architecture.md#theme--design-tokens` and `#components` defer to it rather than restating its contents.
