/**
 * GROQ queries for the FactNuggets content platform.
 *
 * DESIGN RULE FOR EVERY QUERY IN THIS FILE
 * 04-content-platform.md: "The app should never need to transform complex
 * data." So the flattening happens *here*, at the edge, not on device. Each
 * query returns a shape that is one trivial mapping step away from the app's
 * own types — references are dereferenced, inverse relationships are resolved,
 * and nothing comes back that a screen would have to join.
 *
 * ── TIER MAPPING (important) ────────────────────────────────────────────────
 * The Studio models five tiers:
 *
 *     ExplorerWorld › Category › Deck › Discovery › DiscoveryCard
 *
 * The app currently models four, and its `Category` type — `{id: WorldId,
 * title, tagline, deckIds}` — is structurally the Studio's **ExplorerWorld**,
 * not the Studio's Category. So these queries map:
 *
 *     Sanity explorerWorld  →  app Category   (types/Category.ts)
 *     Sanity deck           →  app Deck
 *     Sanity discovery      →  app Discovery
 *     Sanity category       →  (not yet consumed — reserved)
 *     Sanity discoveryCard  →  (not yet consumed — reserved)
 *
 * The Studio's Category tier is authored and published but not yet read by the
 * app; it becomes the sub-navigation inside a world when that screen ships.
 * Nothing is lost by ignoring it today — decks carry their own `world`
 * reference precisely so the hierarchy can be traversed without it.
 *
 * ── WHY EVERY QUERY FILTERS ON workflow.status ──────────────────────────────
 * Sanity's own draft/published state is not enough: a document can be published
 * in Sanity while still awaiting educational review. The app must only ever see
 * editorially published content. This filter is the last line of that defence
 * and belongs in every single query — there is no query in this file that may
 * omit it.
 */

const PUBLISHED = `workflow.status == "published"`;

/**
 * Reusable projection for a media asset reference.
 * Returns the raw image ref (so the app can request an exact size from the CDN)
 * plus the LQIP blur placeholder, which is what makes a card feel instant while
 * the real image downloads.
 */
const ASSET_PROJECTION = `{
  "ref": image.asset._ref,
  "lqip": image.asset->metadata.lqip,
  "alt": alt
}`;

/* -------------------------------------------------------------------------- */
/* Categories (Sanity: explorerWorld)                                          */
/* -------------------------------------------------------------------------- */

export const CATEGORIES_QUERY = `
*[_type == "explorerWorld" && ${PUBLISHED}] | order(displayOrder asc) {
  "id": worldId,
  "title": name,
  tagline,
  icon,
  version,
  "status": workflow.status,
  "theme": theme{primary, secondary, backgroundTop, backgroundBottom, onPrimary},
  "deckRefs": *[_type == "deck" && world._ref == ^._id && ${PUBLISHED}]
    | order(displayOrder asc) { "id": slug.current }
}`;

export const CATEGORY_QUERY = `
*[_type == "explorerWorld" && worldId == $categoryId && ${PUBLISHED}][0] {
  "id": worldId,
  "title": name,
  tagline,
  icon,
  version,
  "status": workflow.status,
  "theme": theme{primary, secondary, backgroundTop, backgroundBottom, onPrimary},
  "deckRefs": *[_type == "deck" && world._ref == ^._id && ${PUBLISHED}]
    | order(displayOrder asc) { "id": slug.current }
}`;

/* -------------------------------------------------------------------------- */
/* Decks                                                                       */
/* -------------------------------------------------------------------------- */

const DECK_PROJECTION = `{
  "id": slug.current,
  "slug": slug.current,
  title,
  subtitle,
  description,
  "category": world->worldId,
  displayOrder,
  isFree,
  productId,
  estimatedMinutes,
  version,
  "status": workflow.status,
  "ageRange": ageRange{min, max},
  "difficulty": difficulty->{ "id": slug.current, name, icon },
  "rewardBadge": coalesce(
    completionReward{icon, label},
    completionBadge->{icon, "label": name}
  ),
  "coverArt": coverArt->${ASSET_PROJECTION},
  "heroArt": heroArt->${ASSET_PROJECTION},
  "discoveryRefs": *[_type == "discovery" && deck._ref == ^._id && ${PUBLISHED}]
    | order(displayOrder asc) { "id": slug.current }
}`;

export const DECKS_FOR_CATEGORY_QUERY = `
*[_type == "deck" && world->worldId == $categoryId && ${PUBLISHED}]
  | order(displayOrder asc) ${DECK_PROJECTION}`;

export const DECK_QUERY = `
*[_type == "deck" && slug.current == $deckId && ${PUBLISHED}][0] ${DECK_PROJECTION}`;

/* -------------------------------------------------------------------------- */
/* Discoveries                                                                 */
/* -------------------------------------------------------------------------- */

const DISCOVERY_PROJECTION = `{
  "id": slug.current,
  "slug": slug.current,
  title,
  subtitle,
  "category": coalesce(deck->world->worldId, category->world->worldId),
  "deck": deck->slug.current,
  displayOrder,
  emoji,
  "headlineFact": headlineFact,
  easyDescription,
  mediumDescription,
  advancedDescription,
  funFacts,
  tags,
  estimatedReadingTime,
  version,
  "status": workflow.status,
  "publishedAt": coalesce(workflow.publishedAt, _createdAt),
  "updatedAt": _updatedAt,
  "heroImage": heroImage->${ASSET_PROJECTION},
  "thumbnail": thumbnail->${ASSET_PROJECTION},
  "stickerReward": stickerReward->{icon, "label": name},
  "discoveryReward": discoveryReward{icon, label},
  "narration": narration->{
    "narrationUrl": audioFile.asset->url,
    "narrationDuration": duration,
    transcript
  },
  "scientificInfo": scientificInfo,
  "cards": *[_type == "discoveryCard" && discovery._ref == ^._id]
    | order(displayOrder asc) {
      "id": _id,
      title,
      body,
      interactionType,
      displayOrder,
      estimatedSeconds,
      question,
      answerOptions,
      "image": image->${ASSET_PROJECTION},
      "animation": animation->{"url": file.asset->url}
    }
}`;

export const DISCOVERIES_FOR_DECK_QUERY = `
*[_type == "discovery" && deck->slug.current == $deckId && ${PUBLISHED}]
  | order(displayOrder asc) ${DISCOVERY_PROJECTION}`;

export const DISCOVERY_QUERY = `
*[_type == "discovery" && slug.current == $discoveryId && ${PUBLISHED}][0]
  ${DISCOVERY_PROJECTION}`;

/* -------------------------------------------------------------------------- */
/* Sync engine support                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The sync manifest — every published document's id and version, and nothing
 * else.
 *
 * This is what makes delta sync possible (06-content-sync-engine.md). The app
 * fetches this one small payload, diffs it against the versions in SQLite, and
 * downloads only the documents that actually changed. On a library of thousands
 * of discoveries the manifest stays a few tens of kilobytes, so a device can
 * check "am I up to date?" cheaply, often, and on a bad connection.
 */
export const SYNC_MANIFEST_QUERY = `{
  "categories": *[_type == "explorerWorld" && ${PUBLISHED}]{"id": worldId, version},
  "decks": *[_type == "deck" && ${PUBLISHED}]{"id": slug.current, version},
  "discoveries": *[_type == "discovery" && ${PUBLISHED}]{"id": slug.current, version},
  "stickers": *[_type == "sticker"]{"id": slug.current, version}
}`;
