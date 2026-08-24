# FactNuggets Privacy Policy

**Effective date:** [INSERT DATE ON PUBLISH]
**Last updated:** [INSERT DATE ON PUBLISH]

> ⚠️ **Draft — requires review before publishing.** This document is written to accurately match how FactNuggets is built as of this writing, but it is not legal advice. Have a lawyer familiar with COPPA (US), GDPR-K (EU/UK), and your local children's-privacy law review this before it goes live, especially the parts in `[brackets]`.

FactNuggets ("**the app**," "**we**," "**us**") is an offline-first educational app that helps children ages 5–8 explore the world through illustrated discovery cards, collectible stickers, and themed learning packs. We built FactNuggets around a simple rule: **we do not collect information from children, we do not show ads, and we do not build behavioral profiles of your child.** This policy explains exactly what data exists, where it lives, and who can see it.

---

## 1. Who operates this app

FactNuggets is developed and operated by **[Legal name of developer/company]**, located at **[Business address, or "an individually operated developer" if a sole proprietor]**. You can reach us at **[support/privacy contact email]** with any question about this policy or your family's data.

---

## 2. Who this app is for

FactNuggets is directed at children. It is designed for children ages **5–8**, and its Google Play and Apple App Store listings declare it accordingly. Because of this, the whole app — not just a "kids section" — is built to the stricter of the two platforms' children's-app rules (Google Play Families Policy Requirements and Apple's Kids Category / App Review Guideline 5.1.4).

---

## 3. The short version

|                                                                      |                                                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does the app work without an account?                                | Yes — always. No sign-up is required to use FactNuggets.                                                                                         |
| Does a child ever type in personal information?                      | No. There is no text input, chat, username, or profile field a child fills in.                                                                   |
| Do we show ads?                                                      | No. FactNuggets has no advertising and never will while marketed to children.                                                                    |
| Do we use advertising identifiers (AAID/IDFA)?                       | No.                                                                                                                                              |
| Do we track location?                                                | No. The app never requests location access.                                                                                                      |
| Do we use the camera, microphone, or contacts?                       | No.                                                                                                                                              |
| Can a parent create an account in the public Android release?        | No. Parent accounts and Backup & Sync are disabled in that release.                                                                              |
| Does a child's profile ("Explorer") contain identifying information? | No. It contains only a randomly generated ID, a chosen cosmetic appearance, and timestamps — never a name, birthdate, photo, email, or location. |
| Are purchases available in the public Android release?               | No. Purchases are disabled.                                                                                                                      |

---

## 4. Information we do **not** collect

To be explicit about what does not happen inside FactNuggets:

- We do not collect a child's name, birthdate, photo, voice, handwriting, or any biometric data.
- We do not collect precise or coarse location.
- We do not access the camera, microphone, contacts, or files on your device beyond what the app needs to store its own local data.
- We do not use advertising identifiers (Android Advertising ID / Apple IDFA) or any persistent device identifier (IMEI, MAC address, SIM serial, etc.) for tracking.
- We do not show advertising of any kind, so we do not share data with ad networks, ad exchanges, or data brokers.
- We do not allow children to chat, message, or otherwise communicate with other people inside the app.
- We do not sell personal information, in the ordinary sense or as defined by CCPA/CPRA.

---

## 5. Information the app stores locally, on-device

The public Android release works entirely offline and stores the following information in a local database (SQLite):

- **Explorer profile** — a locally generated ID and a cosmetic appearance the child picks (for example, a character skin color). No name, age, or photo is ever requested.
- **Learning progress** — which discovery cards have been viewed or collected, which learning packs and badges have been completed or earned, and when.
- **App settings** — things like sound on/off, which are device-local and never leave the device.
- **Educational content** — discovery cards, images, and pack content downloaded from our content platform (Sanity CMS) for offline use. This is app content, not information about your family.

The app may request public educational content and images from Sanity. It does not send an Explorer profile, learning progress, account, purchase, contact, location, or advertising data with those requests. As with any internet connection, Sanity and network providers may receive technical connection data, such as IP address, device or browser information, request time, and server logs, to deliver and secure content. Parents can use bundled content while offline.

---

## 6. Optional parent account and cloud backup ("Backup & Sync")

Parent accounts and Backup & Sync are disabled in the public Android release. The following describes a planned, parent-only feature and does not apply until a later release enables it with an updated policy and any required parental choices or consent:

- **Only a parent creates the account.** Account creation uses an email address and password (via Firebase Authentication). A child never sees or completes this flow; it lives behind the app's Parent Area.
- **We collect the parent's email address** to create and secure that account, and to allow password resets. We do not use it for marketing and do not share it with third parties.
- **A child's "Explorer" record, when synced to the cloud, still contains no personal information about the child** — only its opaque ID, its cosmetic appearance, and timestamps. Learning progress (which cards were viewed/collected, badges earned, pack completion) is synced tied to that anonymous ID, scoped to your family, never to the child's real identity.
- **Cloud data is stored in Firebase (Google Cloud) and access is restricted by security rules** so that only the authenticated parent(s) belonging to a family can read or write that family's data. No other user, family, or unauthenticated request can access it.
- **Signing in never automatically shares data across unrelated accounts.** A parent must take an explicit action to create or join a family; nothing is merged silently.
- Turning Backup & Sync off, or never turning it on, has no effect on the app's core learning experience — it remains fully available offline.

---

## 7. Purchases

Purchases are disabled in the public Android release. If optional paid content is enabled in a later release, it will use **Apple's App Store** (StoreKit) or **Google Play Billing** — never a third-party payment processor. In that case:

- We never see, collect, or store your payment card, billing address, or Apple/Google account credentials.
- Apple and Google are the sole source of truth for what has been purchased; the app keeps a small local cache of "what's unlocked" that is verified against the Store, and can be restored using each platform's standard "Restore Purchases" mechanism.
- Purchases are protected by the purchase-confirmation and parental controls built into the App Store and Google Play (including, where enabled by a family, Ask to Buy and Play Family purchase approvals) — FactNuggets does not bypass these.

---

## 8. Third-party services we use

| Service                                           | What it's used for                                                 | What it receives                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Sanity** (content platform)                     | Delivers the app's educational cards, images, and pack content     | Public-content requests and associated technical connection data; no Explorer or progress data. |
| **Firebase Authentication** (Google)              | Planned parent sign-in for Backup & Sync; disabled in this release | Parent email address and authentication credentials only if the future feature is enabled.      |
| **Firebase Firestore / Cloud Functions** (Google) | Planned cloud backup; disabled in this release                     | Family-scoped progress data only if the future feature is enabled.                              |
| **Apple App Store / Google Play Billing**         | Planned purchases; disabled in this release                        | Purchase/payment details only if purchases are enabled, handled by Apple/Google.                |

We do not use any advertising SDK, analytics SDK that profiles individual users, or third-party marketing tool. **[If Crashlytics, Firebase Analytics, or push notifications are added in a future version, this section and the app's Google Play Data Safety / Apple Nutrition Label disclosures will be updated first, and configured to avoid collecting anything that identifies a child, before that update ships.]**

---

## 9. How we secure data

- Cloud data (Firestore) uses default-deny security rules: every request must belong to an authenticated parent who is a verified member of that specific family, and the structure/fields of every write are validated server-side.
- Data in transit to and from our cloud services is encrypted (HTTPS/TLS).
- We maintain separate development, staging, and production environments so test data is never mixed with real family data.

---

## 10. Data retention and deletion

- **Local, on-device data** stays on the device until the app is uninstalled or the parent clears it from within the app.
- **Cloud data** (only present if Backup & Sync was enabled) is retained until the parent requests deletion.
- To request deletion of a parent account and all associated family/cloud data, contact us at **[privacy/support contact email]**. We will delete cloud-held data within [X] days of a verified request. This does not affect data already stored locally on your device, which you control directly.

---

## 11. Your (the parent's) rights and choices

As the account holder, you can at any time:

- Use FactNuggets without ever creating an account.
- Use the app without creating an account or enabling cloud backup in the public Android release.
- Request a copy of, or deletion of, the data associated with your parent account by contacting us.
- Keep purchases disabled in the public Android release.

If you are located in the EU/UK/EEA, California, or another jurisdiction with statutory data-subject rights (GDPR, UK GDPR, CCPA/CPRA, etc.), those rights apply to the parent-account data described above; contact us at **[privacy contact email]** to exercise them. **[Counsel should confirm the specific legal bases, retention periods, and any required DPA/sub-processor list here.]**

---

## 12. Children's privacy (COPPA / GDPR-K)

FactNuggets is designed so that **no personal information is ever collected directly from a child**:

- There is no text input, username, chat, or upload feature available to a child inside the app.
- The public Android release supports no account. A future parent account, if enabled, will be created and controlled by an adult in the Parent Area, which requires an adult-level task to reach.
- A child's in-app profile ("Explorer") is limited to a random ID, a cosmetic appearance choice, and activity timestamps — never a name, age, birthdate, photo, or contact information.

If we ever discover that personal information has been collected from a child in a way inconsistent with this policy, we will delete it promptly. Parents who believe this may have happened should contact us immediately at **[privacy contact email]**.

---

## 13. International users

FactNuggets may be used by families outside the country where our servers are located. By using cloud Backup & Sync, you understand your family's account data (Section 6) may be processed in data centers operated by our service providers (e.g., Google Cloud, for Firebase) in accordance with their own security and privacy commitments. **[Counsel should confirm cross-border transfer mechanisms if targeting the EU/UK, e.g., SCCs.]**

---

## 14. Changes to this policy

If we materially change what we collect or how we use it — including adding any new SDK, analytics, or feature that touches data — we will update this page and, where required by app store policy, prompt for renewed consent before the change takes effect. Continued use of Backup & Sync after a material change may require re-acknowledging this policy.

---

## 15. Contact us

Questions about this policy or your family's data:

**[Support/privacy email]**
**[Optional: mailing address, if required by your counsel or by a specific regulator]**

---

_This policy describes FactNuggets version [X.X] as of [date]. It should be re-reviewed any time Firebase Analytics, Crashlytics, push notifications, or any new third-party SDK is added to the app, per `docs/implementation/03-firebase.md` and `docs/implementation/13-apple-kids-compliance.md`._
