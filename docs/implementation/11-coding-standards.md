# 11 — Coding Standards

> Part of the Kids Discovery implementation specification.

---

## TypeScript

- Strict mode enabled.
- **No `any`.**
- Use interfaces for models.
- Shared types live inside `/types`.
- Feature-specific types live inside `features/<feature>/types/`.
- Typed navigation only.

---

## Style

- Prefer composition over inheritance.
- Keep files under approximately **300 lines** where practical.
- Separate UI from business logic.
- Separate business logic from Firebase and Sanity via the Repository/Service layers (see `01-project-architecture.md#repositories-layer`).
- Prefer pure functions.
- Document public utilities.
- Prefer readability over cleverness.
- Avoid unnecessary abstraction and overengineering.

---

## Components

Reusable components only. The canonical baseline set is defined once in [`01-project-architecture.md#components`](01-project-architecture.md#components) — this document doesn't restate it.

**Never duplicate UI.** Extend an existing component before creating a new one.

---

## Styling

- NativeWind + Tailwind.
- Design tokens for colors, spacing, radius, typography, elevation, animation durations.
- No inline colors.
- No hardcoded spacing.

---

## Error Handling

Every Firebase request must handle the canonical checklist defined in [`03-firebase.md#error-handling`](03-firebase.md#error-handling) (loading, failure, retry, offline mode, friendly UI, never crash) — this document doesn't restate it.

---

## Security

- Environment variables for configuration.
- No secrets inside source code.
- Firestore Rules and Authentication Rules version controlled.
- App Check before production.

---

## Testing

Each feature should include:

- Unit Tests
- Component Tests
- Integration Tests where appropriate

Critical purchase flows must always be tested (`09-purchases.md`).

Feature tests live in `features/<feature>/tests/`; shared setup lives in `tests/`.
