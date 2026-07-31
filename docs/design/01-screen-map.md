# 01 — Screen Map

> Part of the FactNuggets design specification.
> Reconciles the product brief with `docs/product/02-user-flows.md` into a concrete navigation model. Typed route definitions live in `navigation/types.ts` — this document is the map those types implement.

---

## Navigation Philosophy

No traditional menu-driven navigation. Per the brief and `02-user-flows.md`: large friendly buttons, world-based navigation, a small curated set of choices at every step — never an endless list, never a hamburger menu.

Three-tab shell, always visible once onboarding is complete:

```
Explore 🌎        Collection ⭐        Parent Area 🔒
```

---

## Root Decision Tree

```
App Launch
    ↓
Hydrate local identity from SQLite → Zustand (useExplorerStore)
    ↓
Has the child chosen an explorer identity before?
    │
    ├── No  → OnboardingNavigator
    │             Welcome
    │               ↓
    │             Explorer Identity Selection
    │               ↓
    │             (enters MainTabNavigator → Explore tab → Discovery Selection)
    │
    └── Yes → MainTabNavigator
                  Explore tab opens to:
                    - an in-progress world's Home, if one exists ("Welcome Back Explorer")
                    - otherwise Discovery Selection
```

The Welcome and Explorer Identity screens are shown exactly once (guest mode, local-only — no login, no email, no parent step, per `02-user-flows.md` Step 1). This is a one-time cosmetic choice, not an account: no name or age is collected, keeping the zero-friction promise and minimizing data collection per `13-apple-kids-compliance.md`.

---

## MainTabNavigator

### Tab 1 — Explore 🌎 (stack)

```
Discovery Selection ("What should we discover today?")
    ↓ (pick a world)
World Home (Ocean / Space / Dinosaur / Animal / Earth)
    ↓ (Continue Exploring, or a New Discovery card)
Discovery Card (the learning-card museum piece)
    ↓ (finish the deck)
Completion (reward celebration + "what next?")
    ↓ (child's choice)
   → back to Discovery Selection, or another World Home, or Explore another deck
```

- **Discovery Selection**: 4 curated cards max, never a scrolling grid. Shows progress on any world already started.
- **World Home**: `Continue Exploring` (largest card, only if a deck is in progress) → `New Discoveries` (small curated row) → `My Collection` (shelf preview, links to the Collection tab). Themed by that world's `WorldBackground`.
- **Discovery Card**: one discovery at a time — illustration, fact, supporting explanation, tap-to-reveal detail, next/previous. Not a swipe feed; advancing is a deliberate tap, matching the brief's "discovery card museum" direction over `02-user-flows.md`'s literal swipe wording — both satisfy "one discovery, deliberate advance," a tap is more reliable for this age group's motor control.
- **Completion**: fires when every discovery in a deck is done. Reward sequence, then an explicit choice of what to do next — never autoplay, never forced continuation (`02-user-flows.md` Step 8).

### Tab 2 — Collection ⭐ (stack)

```
Collection Shelf ("My Discoveries" — every discovery collected, across all worlds)
    ↓ (tap an item)
Quick Recall sheet (modal — the discovery's fact again, no navigation away from the shelf)
```

### Tab 3 — Parent Area 🔒 (stack, always gated)

```
(tap the tab)
    ↓
Parental Gate (math challenge, voice-forward prompt)
    ↓ success
Parent Area (calm trust hub)
    ↓ (a locked world's "unlock" CTA, reached either from here or from Explore)
Pack Preview (pack contents, age band, trust badges, purchase CTA)
```

The gate guards the entire tab, not just the purchase screen — this matches the explicit flow in `02-user-flows.md` ("Parent Area → Answer: What is 7 + 8?") and gives one simple rule ("Parent Area is always behind the gate") instead of a conditional one. Purchase-specific gating (required by `13-apple-kids-compliance.md` before any IAP) is satisfied a fortiori since the whole tab is already gated.

---

## Screen Inventory

| Screen                      | Route                         | Purpose                             | Key states                                                                                    |
| --------------------------- | ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Welcome                     | `Onboarding/Welcome`          | First-run wonder moment, zero setup | — (no error/loading; fully local)                                                             |
| Explorer Identity Selection | `Onboarding/ExplorerIdentity` | Choose a cosmetic identity          | —                                                                                             |
| Discovery Selection         | `Explore/DiscoverySelection`  | Choose today's world                | loading (content read), offline (cached content still renders)                                |
| World Home                  | `Explore/WorldHome`           | That world's mini-environment       | empty (no decks started yet), offline                                                         |
| Discovery Card              | `Explore/DiscoveryCard`       | Core learning interaction           | loading (image), offline                                                                      |
| Completion                  | `Explore/Completion`          | Celebrate + choose next             | —                                                                                             |
| Collection Shelf            | `Collection/Shelf`            | Full cross-world collection         | empty ("no discoveries yet — go explore!")                                                    |
| Parental Gate               | `Parent/Gate`                 | Adult-only checkpoint               | failure (wrong answer → gentle retry, no lockout/shame)                                       |
| Parent Area                 | `Parent/Area`                 | Trust + settings hub                | —                                                                                             |
| Pack Preview                | `Parent/PackPreview`          | Purchase decision                   | purchase pending/failed (UI shell only this pass — see `docs/implementation/09-purchases.md`) |

Loading/error/offline states follow the canonical checklist in `docs/implementation/03-firebase.md#error-handling`: every screen shows cached content immediately, never blocks on network, and never renders an empty state just because the device is offline.

---

## Analytics Touchpoints

Fires only the canonical events already defined in `docs/implementation/03-firebase.md#analytics` — no new events invented here:

| Screen transition                           | Event                 |
| ------------------------------------------- | --------------------- |
| App launches                                | `App Open`            |
| Discovery Selection → World Home            | `Category Viewed`     |
| World Home → first Discovery Card of a deck | `Deck Started`        |
| Entering a Discovery Card                   | `Discovery Viewed`    |
| Finishing a Discovery Card                  | `Discovery Completed` |
| Reaching Completion                         | `Deck Completed`      |
| Reward granted                              | `Sticker Earned`      |
| Pack Preview purchase completes             | `Expansion Purchased` |

Event wiring itself goes through `AnalyticsService` (`01-project-architecture.md#service-layer`) once that service exists — out of scope for this UI pass, noted here so screens call a single `trackEvent()` seam rather than nothing.

---

## Returning vs First-Time Copy

Per `02-user-flows.md` sections 3–4, the same screens carry different framing depending on whether local progress exists:

- First-time World Home: "What should we discover today?"
- Returning World Home: "Welcome Back Explorer 🌎 — your next discovery awaits."

This is a copy/data difference only (which deck to surface first) — no separate screen or route.
