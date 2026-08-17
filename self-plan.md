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
