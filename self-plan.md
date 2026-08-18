Note for AI Assistants (Claude Code, ChatGPT, Cursor, etc.):

This document is a personal project management roadmap and progress tracker for the developer. It is not an implementation specification, architectural guide, coding standard, or source of truth for the application.

Do not use this document to make implementation decisions or infer technical requirements. It exists solely to track development progress, milestones, and completed work.

When implementing code, designing architecture, or making technical decisions, always follow the dedicated documents in the docs/implementation/ directory (such as the architecture, tech stack, Firebase, Sanity, UI, and coding standards documents). If this roadmap conflicts with those specifications, the implementation documents always take precedence.

# ==============================================================================

# Kids Discovery App - Master Development Roadmap

# ==============================================================================

#

# Status:

# [ ] Not Started

# [x] In Progress

# [ ] Review

# [ ] Complete

#

# ==============================================================================

# PHASE 0 — PROJECT SETUP

# ==============================================================================

[x] Decide tech stack
[x] Create GitHub repository
[x] Create development branch strategy
[x] Create project folder structure
[x] Configure Claude Code
[x] Setup linting
[x] Setup formatting
[x] Create README

Deliverables:
□ Repository
□ Initial project structure

================================================================================
PHASE 1 — PRODUCT PLANNING
================================================================================

[x] Product Vision
[x] Product Principles
[x] Target Audience
[x] User Personas
[ ] Monetisation Strategy
[x] User flows
[x] MVP Definition

5 Data model & architecture
6 Sanity CMS + real content pipeline
7 Local database & persistence
8 Real monetisation / IAP
9 Firebase Auth + cloud accounts
10 Notifications
11 Analytics + production hardening
12 Content expansion / launch

17 august 26

Phase Status now What happens 5. Data model & architecture Mostly done 5A + 5B are done. 5C Sanity schema work was done on the other machine. 5D is paused because you don't have the Studio repo here. 6. Sanity CMS + real content pipeline Paused This is the main thing we're temporarily skipping. Typed GROQ, DTO mapping, Sanity cutover, content sync, image pipeline all wait until you have the Studio repo again. 7. Local database & persistence Do now This is Phase 5E in our detailed breakdown. Explorer-scoped SQLite, real progress persistence, badges, Pack progress, migrations. 8. Real monetisation / IAP Not yet We can prepare entitlement architecture, but I would not build real StoreKit/Play Billing yet. 9. Firebase Auth + cloud accounts Can start after local DB foundation Firebase project setup and Auth foundation are okay; real sync should follow SQLite. 10. Notifications Skip for now No reason to build this yet. 11. Analytics + production hardening Mostly later Some testing/hardening can happen continuously, but full analytics should wait until flows/data are stable. 12. Content expansion / launch Skip for now Don't scale content until Sanity + local persistence + monetisation foundation are solid.

---

phase 8 stages

Phase 8 should be divided into subphases
Use:
Phase 8A — Commerce prerequisite audit
No code changes.
Inspect what actually exists and identify blockers.
Phase 8B — Commerce + entitlement contracts
Build the architecture without making a real purchase.
Phase 8C — Local entitlement persistence
Extend Phase 7 SQLite cleanly.
Phase 8D — Store product catalogue
Connect stable commerceKey values to Apple/Google products.
Phase 8E — Native IAP provider
Implement Apple/Google purchasing.
Phase 8F — Purchase UX
Connect Parent Gate → Pack Preview → purchase → unlock.
Phase 8G — Restore + recovery
Restore purchases and handle interrupted/pending purchases.
Phase 8H — Native validation
Real sandbox/test purchase testing on Android and iOS.
That separation will make failures much easier to diagnose.

phase 9

9A — Firebase prerequisite & sync architecture audit
Read-only first. Determine current packages/config, identify exactly what should sync, define family/account model, conflict rules, privacy considerations, and whether Firebase projects already exist.
9B — Parent authentication foundation
Optional parent account creation/sign-in, likely without forcing children into account concepts.
9C — Family / Explorer cloud identity mapping
One parent may eventually own multiple Explorers. Local Explorer IDs need stable cloud mapping without replacing their local identity.
9D — Cloud progress replication
Discovery progress, Pack progress, Badges, settings where appropriate.
9E — Conflict resolution + offline sync
Your previously agreed monotonic rules become important here: collected beats revealed, Badge union, earliest achievement timestamp, latest lastViewed, etc.
9F — Account recovery / sign-out / merge behavior
Especially important: what happens when someone has significant guest progress and then creates an account?
9G — Native validation + multi-device scenarios

11A — Full production-readiness pre-check
Audit package health, native config, environment separation, secrets, Firebase project readiness, Store readiness, crash/error handling, build configuration, dependency advisories, and all known deferred warnings.

11B — End-to-end local + emulator validation
Re-run the entire Phase 7–9 system as one integrated product:
child flow, SQLite, commerce, Auth, Family bootstrap, Backup & Sync, account switching, remote import, reinstall recovery, offline/reconnect, and cross-family security.

11C — Real Android native lifecycle validation
Actual install/run/restart/background/foreground/reinstall/device-state validation, not just assembleDebug.

11D — Real Firebase development environment validation
Create/configure the real development Firebase project, enable Email/Password Auth, deploy dev Firestore Rules + Functions, verify live Auth/Firestore/Functions, and confirm emulator/live behavior matches.

11E — Security hardening
Review Firestore Rules, Functions authorization, App Check readiness/enforcement plan, data minimization, secrets, logging, error leakage, abuse cases, dependency advisories, and account/family isolation.

11F — Performance + resilience hardening
Startup performance, SQLite access, Firestore request volume, retries, offline behavior, duplicate initialization, in-flight guards, memory/resource issues, crash paths, malformed data, interrupted operations.

11G — Commerce production-readiness / Phase 8H closure
Once Apple/Google developer accounts exist: real product setup, sandbox purchases, restore, pending/cancel/already-owned scenarios, entitlement persistence, install/reinstall behavior, and platform-specific Store validation.

11H — iOS native validation
On macOS/iOS hardware or simulator: build, launch, persistence, Auth restore, Backup & Sync, Store integration when available, lifecycle/reinstall behavior.

11I — Analytics / crash reporting decision + implementation
Only after core production behavior is stable. Add privacy-conscious analytics and crash reporting if you actually want them; keep them parent/privacy-safe and separate from child engagement manipulation.

11J — Final release candidate E2E audit
One final go/no-go covering app boot, child learning loop, purchases, backup/recovery, wrong-account safety, fresh-device restore, offline/reconnect, security, native builds, dependency status, and all production services.
