/**
 * GROQ against the canonical Studio schema (studio-factnuggets/schemaTypes).
 *
 * One coherent snapshot query, not five separate requests: partial content
 * (a World with no Packs because the Packs request failed independently) is
 * exactly the inconsistency Phase 11C.2 §35/§36 forbids. A single request
 * either returns everything or the fetch fails outright — there is no
 * in-between state for the validator to reason about.
 *
 * Every branch filters on `editorialStatus == "published"`. Sanity's own
 * draft/published mechanism is not that filter — perspective:'published' on
 * the client (infrastructure/sanity/sanityClient.ts) keeps drafts out, but a
 * document can be technically published in Sanity while still editorially
 * unreviewed. This filter is the belt to that braces, and every projection
 * below applies it, including to dereferenced Pack↔Discovery memberships.
 */
const PUBLISHED = 'editorialStatus == "published"';

const CONTENT_IMAGE_PROJECTION = `{
  "ref": image.asset._ref,
  "alt": alt
}`;

export const CONTENT_SNAPSHOT_QUERY = `{
  "worlds": *[_type == "world" && ${PUBLISHED}] | order(displayOrder asc) {
    domainId,
    "slug": slug.current,
    title,
    tagline,
    themeKey,
    displayOrder,
    "badge": badge{
      title,
      accessibleDescription,
      "artwork": artwork${CONTENT_IMAGE_PROJECTION}
    }
  },
  "learningPacks": *[_type == "learningPack" && ${PUBLISHED}] | order(displayOrder asc) {
    domainId,
    "slug": slug.current,
    "worldDomainId": world->domainId,
    title,
    subtitle,
    displayOrder,
    accessType,
    worldCompletionRole,
    "memberships": discoveries[]{
      "discoveryDomainId": discovery->domainId,
      "discoveryPublished": discovery->editorialStatus == "published",
      completionRole
    }
  },
  "discoveries": *[_type == "discovery" && ${PUBLISHED}] {
    domainId,
    "slug": slug.current,
    title,
    subtitle,
    headlineFact,
    explanation,
    additionalExplanations[]{label, explanation},
    emojiFallback,
    estimatedSeconds,
    "images": media[]${CONTENT_IMAGE_PROJECTION}
  }
}`;
