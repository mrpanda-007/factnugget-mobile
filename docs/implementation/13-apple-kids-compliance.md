# 13 — Apple Kids Category Compliance

> Part of the Kids Discovery implementation specification.
> Source: [developer.apple.com/kids](https://developer.apple.com/kids/)

This document exists because the app targets children aged 5–8 and is expected to ship in Apple's **Kids category**. It overlays requirements onto the other documents — it does not replace them.

---

## Open Decision: Age Band

Apple requires selecting a single age band in App Store Connect for the Kids category:

- 5 and under
- **6–8**
- 9–11

The stated target audience (5–8 years) straddles the first two bands. **Pick one before implementation begins** — this affects reading level, UI complexity, and whether parental gates need a voiceover prompt for pre-literate users (required if targeting 5-and-under). Default recommendation: **6–8**, with pre-literate-friendly parental gates built in anyway since 5-year-olds are still in scope. Confirm with the product owner; do not assume.

---

## App Review Requirements

- Must comply with **App Review Guideline 1.3** (Kids Category) and **Guideline 5.1.4** (Kids — data collection/privacy).
- App age rating must be set in App Store Connect; this also drives the age rating shown on the product page.

---

## Data & Privacy

- **No personally identifiable information or device information may be transmitted to third parties** — including in any adult-facing section of the app — unless the parent has explicitly consented.
- This constrains `03-firebase.md`: Analytics and Crashlytics must be configured to avoid PII, and any third-party SDK (including Firebase itself) must be reviewed against this rule.
- Privacy nutrition label (App Store product page) must accurately reflect data collection — keep this in sync with what Firestore/Analytics actually collect.

---

## Parental Gates

Required before any of the following:

- In-App Purchases
- Linking out to external content (websites, social networks, other apps)

Implementation notes:

- A parental gate is an adult-level task (e.g., solve a math problem, answer a question) — see Apple's reference examples.
- For pre-literate children, add a voiceover prompt so the child understands a parent needs to be involved.
- Build this as the shared `ParentalGate` component — it is part of the canonical baseline component set in `01-project-architecture.md#components`. Do not duplicate the gate UI per feature.

---

## Purchases (extends `09-purchases.md`)

- **Ask to Buy**: children can request a purchase; a parent approves or denies from their own device. StoreKit 2 supports this natively — no custom build needed, but the purchase flow and its tests must account for a pending/awaiting-approval state.
- **`ageRatingCode`**: where required by law, monitor for age-rating changes on the user's device via StoreKit.
- **Significant Change API / consent**: if the app's age rating or a feature changes in a way that counts as a "significant change," trigger a re-consent flow via the Significant Change API before the child can continue.
- **App Store Server Notifications**: handle the consent-withdrawn notification type — when a parent withdraws consent, the app must stop launching for that child's account. This needs a corresponding state in `AuthService` (see `01-project-architecture.md#service-layer` and `03-firebase.md`).

---

## Advertising

If advertising is ever added (not currently in `01-project-architecture.md`), all ad content must be **human-reviewed for age appropriateness** before being displayed. This is a hard gate — do not rely on automated ad-network filtering alone. Treat this as a blocker to adding any ad SDK, not a launch afterthought.

---

## Explicitly Out of Scope for MVP

Per the "avoid overengineering" principle in `01-project-architecture.md`, the following Apple frameworks are **not required now** because the app has no messaging, user-generated content, or in-app web browsing. Revisit if scope changes:

- **PermissionKit** — only needed if children can communicate with other users.
- **SensitiveContentAnalysis** — only needed for user-submitted images/video.
- **Screen Time / DeviceActivity / ManagedSettings / FamilyControls** — only needed for custom parental-control dashboards or in-app web content; the OS-level Screen Time controls already apply to the app without integration work.
- **Declared Age Range API** — optional; only needed if content/experience should vary by declared age within the chosen age band. Revisit if the 5-and-under vs 6-8 split above turns into a real product requirement rather than a single fixed band.

---

## Cross-References

| Requirement | Also see |
|---|---|
| PII/device data restrictions | `03-firebase.md` |
| Parental gate component | `01-project-architecture.md#components` |
| Ask to Buy, consent withdrawal | `09-purchases.md` |
| Age-appropriate content by band | `04-content-platform.md` |
