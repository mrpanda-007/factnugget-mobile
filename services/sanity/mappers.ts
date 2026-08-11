import type { WorldId } from '@constants/tokens';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type {
  ContentStatus,
  DifficultyLevel,
  Discovery,
  DiscoveryReward,
} from '@app-types/Discovery';

import { buildImageUrl } from './client';

/**
 * Raw GROQ results → the app's own types.
 *
 * This layer is deliberately thin. The GROQ in `queries.ts` does the joining
 * and flattening; everything left here is the handful of conversions that GROQ
 * genuinely cannot do — building CDN URLs at the right pixel size, and
 * defending against fields that are optional in the CMS but non-optional in the
 * app's types.
 *
 * WHY DEFEND AT ALL, GIVEN THE PUBLISH GATES
 * The Studio's publish gates make missing hero images and missing rewards
 * impossible *going forward*. They cannot retroactively fix a document
 * published before a gate existed, and they cannot help a device holding a
 * cached copy from an older schema. A children's app should degrade to an emoji
 * and a sensible default, never to a red screen — so every mapper below has a
 * fallback and none of them throw.
 */

/* -------------------------------------------------------------------------- */
/* Raw shapes (what GROQ returns)                                              */
/* -------------------------------------------------------------------------- */

interface RawAsset {
  ref?: string | null;
  lqip?: string | null;
  alt?: string | null;
}

interface RawRef {
  id?: string | null;
}

interface RawCategory {
  id?: WorldId;
  title?: string;
  tagline?: string;
  version?: string;
  status?: string;
  deckRefs?: RawRef[];
}

interface RawDeck {
  id?: string;
  slug?: string;
  title?: string;
  subtitle?: string;
  category?: WorldId;
  displayOrder?: number;
  isFree?: boolean;
  version?: string;
  status?: string;
  rewardBadge?: { icon?: string; label?: string } | null;
  discoveryRefs?: RawRef[];
}

interface RawDiscovery {
  id?: string;
  slug?: string;
  title?: string;
  subtitle?: string;
  category?: WorldId;
  deck?: string;
  displayOrder?: number;
  emoji?: string;
  headlineFact?: string;
  easyDescription?: string;
  mediumDescription?: string;
  advancedDescription?: string;
  funFacts?: string[];
  tags?: string[];
  estimatedReadingTime?: number;
  version?: string;
  status?: string;
  publishedAt?: string;
  updatedAt?: string;
  heroImage?: RawAsset | null;
  images?: RawAsset[] | null;
  stickerReward?: { icon?: string; label?: string } | null;
  discoveryReward?: { icon?: string; label?: string } | null;
  narration?: {
    narrationUrl?: string | null;
    narrationDuration?: number | null;
    transcript?: string | null;
  } | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The app's `ContentStatus` is a two-state type; the CMS workflow has five.
 * Anything that is not editorially published is `draft` as far as the app is
 * concerned — and in practice the queries never return those, so this is a
 * belt-and-braces conversion for cached data written by an older build.
 */
const toContentStatus = (status?: string): ContentStatus =>
  status === 'published' ? 'published' : 'draft';

const toReward = (
  raw: { icon?: string; label?: string } | null | undefined,
  fallbackLabel: string,
): DiscoveryReward => ({
  icon: raw?.icon ?? '⭐',
  label: raw?.label ?? fallbackLabel,
});

const flattenRefs = (refs?: RawRef[]): string[] =>
  (refs ?? []).map((r) => r.id).filter((id): id is string => Boolean(id));

/* -------------------------------------------------------------------------- */
/* Mappers                                                                     */
/* -------------------------------------------------------------------------- */

/** Sanity `explorerWorld` → app `Category`. See queries.ts §TIER MAPPING. */
export function mapCategory(raw: RawCategory): Category {
  return {
    id: raw.id as WorldId,
    title: raw.title ?? '',
    tagline: raw.tagline ?? '',
    deckIds: flattenRefs(raw.deckRefs),
    version: raw.version ?? '1.0.0',
    status: toContentStatus(raw.status),
  };
}

export function mapDeck(raw: RawDeck): Deck {
  return {
    id: raw.id ?? '',
    slug: raw.slug ?? raw.id ?? '',
    title: raw.title ?? '',
    subtitle: raw.subtitle ?? '',
    category: raw.category as WorldId,
    displayOrder: raw.displayOrder ?? 0,
    discoveryIds: flattenRefs(raw.discoveryRefs),
    rewardBadge: toReward(raw.rewardBadge, 'Explorer Badge'),
    // Absent `isFree` must mean *locked*, never free. A mapping bug that
    // defaults the other way gives away paid content — an error the business
    // cannot detect from the outside and cannot undo once it has happened.
    isFree: raw.isFree === true,
    version: raw.version ?? '1.0.0',
    status: toContentStatus(raw.status),
  };
}

export function mapDiscovery(raw: RawDiscovery): Discovery {
  /**
   * All three reading levels are required by the Studio's validation, so in
   * practice this is always the full set. It is computed rather than assumed so
   * that a partially authored document cached by an older build still reports
   * honestly which registers it can actually render.
   */
  const difficultyLevels: DifficultyLevel[] = [];
  if (raw.easyDescription) difficultyLevels.push('easy');
  if (raw.mediumDescription) difficultyLevels.push('medium');
  if (raw.advancedDescription) difficultyLevels.push('advanced');

  return {
    id: raw.id ?? '',
    slug: raw.slug ?? raw.id ?? '',
    title: raw.title ?? '',
    subtitle: raw.subtitle ?? '',
    category: raw.category as WorldId,
    deck: raw.deck ?? '',
    displayOrder: raw.displayOrder ?? 0,

    // 1200px covers the hero at 3× on a large phone. The sync engine downloads
    // this URL once and caches the file; the app never re-requests it.
    heroImage: buildImageUrl(raw.heroImage?.ref, { width: 1200 }),
    // The emoji is the reason a cold, offline first launch still looks
    // finished. Required in the CMS, defaulted here regardless.
    emoji: raw.emoji ?? '✨',
    // Provisional, UI-only field (types/Discovery.ts#images) for the
    // Discovery Card's swipeable photo gallery — not yet a real field in the
    // Studio schema. Defaults to empty until `images` exists in
    // `RawDiscovery`/the GROQ projection in queries.ts; the gallery already
    // degrades to the emoji illustration when this is empty.
    images: (raw.images ?? [])
      .map((asset) => buildImageUrl(asset?.ref, { width: 1200 }))
      .filter((url): url is string => Boolean(url)),

    // The app's `funFact` is the single headline — the line a child repeats.
    // `funFacts` (plural) in the CMS is the extras list, surfaced on cards.
    funFact: raw.headlineFact ?? raw.funFacts?.[0] ?? '',
    easyDescription: raw.easyDescription ?? '',
    mediumDescription: raw.mediumDescription ?? '',
    advancedDescription: raw.advancedDescription ?? '',

    stickerReward: toReward(raw.stickerReward, 'Discovery Sticker'),
    discoveryReward: toReward(raw.discoveryReward, raw.title ?? 'Discovery'),

    estimatedReadingTime: raw.estimatedReadingTime ?? 60,
    tags: raw.tags ?? [],
    difficultyLevels,

    narration: {
      narrationUrl: raw.narration?.narrationUrl ?? null,
      narrationDuration: raw.narration?.narrationDuration ?? null,
      transcript: raw.narration?.transcript ?? null,
    },

    /**
     * `Discovery.quiz` is inert.
     *
     * Interactive questions are now modelled as a `discoveryCard` with
     * `interactionType: "question"` — a better fit, because a question is a
     * *beat inside* a discovery rather than a separate assessment bolted onto
     * the end of one. This object is returned only to satisfy the existing
     * app type; remove both it and the `DiscoveryQuiz` type in
     * types/Discovery.ts once the card renderer ships.
     */
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },

    version: raw.version ?? '1.0.0',
    status: toContentStatus(raw.status),
    publishedAt: raw.publishedAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
  };
}
