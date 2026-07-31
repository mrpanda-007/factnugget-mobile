# 05 — Content Schema

> Part of the Kids Discovery implementation specification.

---

## Purpose

This document defines the field-level schema for every content document type stored in Sanity. It is the reference for TypeScript model definitions and for reviewing schema changes.

Overall architecture and hierarchy are defined in [`04-content-platform.md`](04-content-platform.md). Caching and sync mechanics are defined in [`06-content-sync-engine.md`](06-content-sync-engine.md).

---

## Discovery Schema

Every discovery should be represented as a standalone document inside Sanity.

Minimum required fields:

- `id`
- `slug`
- `title`
- `subtitle`
- `category`
- `deck`
- `displayOrder`
- `heroImage`
- `easyDescription`
- `mediumDescription`
- `advancedDescription`
- `funFact`
- `stickerReward`
- `discoveryReward`
- `estimatedReadingTime`
- `tags`
- `difficultyLevels`
- `narration`
- `quiz`
- `version`
- `status`
- `publishedAt`
- `updatedAt`

The schema must support future localization without structural changes.

---

## Other Document Types

Sanity also manages Category, Deck, Sticker, and Expansion Pack documents (see [`04-content-platform.md`](04-content-platform.md) for how they fit into the hierarchy).

At minimum, every one of these document types shares the conventions defined below under [Content Versioning](#content-versioning) — an `id`/`slug`, `displayOrder`, `version`, and `status`. Full field-level schemas for Category, Deck, Sticker, and Expansion Pack should be added to this document as those Sanity schemas are implemented, following the same review process as any other schema change (see [Content Rules](04-content-platform.md#content-rules)).

---

## Images

All educational images are managed by Sanity.

Images should never be bundled into the application unless they are UI assets.

Sanity is responsible for:

- Image Storage
- Image Optimization
- CDN Delivery
- Metadata
- Alt Text
- Versioning

The application is responsible for:

- Downloading
- Local Caching
- Cache Validation
- Offline Rendering

Download and caching mechanics are defined in [`06-content-sync-engine.md`](06-content-sync-engine.md).

---

## Audio (Future Narration)

Narration is not part of the MVP.

However, the schema must fully support future narration.

Every discovery should include optional fields:

| Field | Type |
|---|---|
| `narrationUrl` | `string \| null` |
| `narrationDuration` | `number \| null` |
| `transcript` | `string \| null` |

These fields remain nullable until narration is introduced.

No narration UI should be implemented during the MVP.

---

## Future Quiz Support

Every discovery should reserve optional quiz metadata.

Example fields:

- `quizEnabled`
- `quizQuestions`
- `quizAnswers`

These remain null during the MVP.

The schema should not require breaking changes when quizzes are added.

---

## Content Versioning

Every Category, Deck, Discovery, and Image must include a version number.

```
Version 1.0
    ↓
Version 1.1
    ↓
Version 1.2
```

The version field is what the sync engine compares against the locally cached copy — see [Version Checking](06-content-sync-engine.md#version-checking--cache-invalidation) in `06-content-sync-engine.md`.
