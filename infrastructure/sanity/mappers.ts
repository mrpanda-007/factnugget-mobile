import type { SanityClient } from '@sanity/client';

import type {
  ContentImage,
  Discovery,
  LearningPack,
  LearningPackDiscovery,
  World,
  WorldBadge,
} from '@app-types/domain/content';
import {
  parseContentSlug,
  parseDiscoveryId,
  parseLearningPackId,
  parseWorldId,
} from '@app-types/domain/ids';
import { getCommerceKeyForLearningPack } from '../../commerce/catalogue';
import {
  CONTENT_SNAPSHOT_SCHEMA_VERSION,
  type ContentSnapshot,
} from '../../application/content/contentSnapshot';

import { buildContentImageUrl } from './sanityClient';

/**
 * Sanity has no badge icon field — the Studio models real uploaded artwork
 * instead (see types/domain/content.ts WorldBadge.artwork). The current
 * WorldBadge UI can only render an emoji, so every Sanity-sourced badge gets
 * this fixed fallback; the real artwork rides along unused on `.artwork` for
 * whenever that UI is upgraded (Phase 11C.3 follow-up, not this phase).
 */
const FALLBACK_BADGE_ICON = '🏆';

/* -------------------------------------------------------------------------- */
/* Raw shapes (what CONTENT_SNAPSHOT_QUERY returns)                           */
/* -------------------------------------------------------------------------- */

interface RawImage {
  ref?: string | null;
  alt?: string | null;
}

interface RawBadge {
  title?: string | null;
  accessibleDescription?: string | null;
  artwork?: RawImage | null;
}

interface RawWorld {
  domainId?: string | null;
  slug?: string | null;
  title?: string | null;
  tagline?: string | null;
  themeKey?: string | null;
  displayOrder?: number | null;
  badge?: RawBadge | null;
}

interface RawMembership {
  discoveryDomainId?: string | null;
  discoveryPublished?: boolean | null;
  completionRole?: string | null;
}

interface RawLearningPack {
  domainId?: string | null;
  slug?: string | null;
  worldDomainId?: string | null;
  title?: string | null;
  subtitle?: string | null;
  displayOrder?: number | null;
  accessType?: string | null;
  worldCompletionRole?: string | null;
  memberships?: RawMembership[] | null;
}

interface RawExplanation {
  label?: string | null;
  explanation?: string | null;
}

interface RawDiscovery {
  domainId?: string | null;
  slug?: string | null;
  title?: string | null;
  subtitle?: string | null;
  headlineFact?: string | null;
  explanation?: string | null;
  additionalExplanations?: RawExplanation[] | null;
  emojiFallback?: string | null;
  estimatedSeconds?: number | null;
  images?: RawImage[] | null;
}

export interface RawContentSnapshot {
  worlds: RawWorld[];
  learningPacks: RawLearningPack[];
  discoveries: RawDiscovery[];
}

/* -------------------------------------------------------------------------- */
/* Content revision fingerprint                                               */
/* -------------------------------------------------------------------------- */

/**
 * A stable fingerprint of "what must be true to have completed this," derived
 * from the set of REQUIRED member ids — never from Sanity's `_rev`, which
 * changes on every edit including a typo fix and would make the stamp noisy
 * and meaningless (Phase 11C.2 §48; studio-factnuggets/ARCHITECTURE.md
 * "Phase 5D derives a completion fingerprint from required Pack memberships").
 *
 * Reordering never changes it (the set is sorted before hashing). Adding or
 * removing a required member does. It is stamped once, at the moment a Pack
 * completes or a Badge is earned (application/DiscoveryProgressService.ts),
 * and never re-read to revoke anything — this is a permanent audit value, not
 * a live gate.
 */
export function computeContentRevision(
  domainId: string,
  requiredMemberIds: readonly string[],
): string {
  const input = `${domainId}:${[...requiredMemberIds].sort().join(',')}`;
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/* -------------------------------------------------------------------------- */
/* Mapping                                                                     */
/* -------------------------------------------------------------------------- */

function mapImage(
  client: SanityClient,
  raw: RawImage | null | undefined,
  fallbackAlt: string,
): ContentImage | null {
  const url = buildContentImageUrl(client, raw?.ref, { width: 1200 });
  if (!url) return null;
  return { url, accessibleDescription: raw?.alt?.trim() || fallbackAlt };
}

function mapBadge(
  client: SanityClient,
  raw: RawBadge | null | undefined,
  worldTitle: string,
): WorldBadge {
  const title = raw?.title?.trim() || `${worldTitle} Badge`;
  const artwork = mapImage(client, raw?.artwork, title) ?? undefined;
  return {
    title,
    icon: FALLBACK_BADGE_ICON,
    accessibleDescription: raw?.accessibleDescription?.trim() || title,
    ...(artwork ? { artwork } : {}),
  };
}

/**
 * Editors author a free-text `label` per additional explanation (Studio does
 * not constrain it to any fixed set), while the mobile domain model requires
 * exactly two named slots. Matched by the conventional labels the seed data
 * uses ("Go deeper"/"Advanced"); an author who uses different labels — or
 * omits the section entirely, since it is optional in the Studio — degrades to
 * positional order and then to an empty string, never a mapping failure. This
 * is a documented schema/domain gap, not a bug: see Phase 11C.2 report §36.
 */
function pickExplanation(
  entries: RawExplanation[] | null | undefined,
  label: string,
  positionalIndex: number,
): string {
  const byLabel = entries?.find((entry) => entry.label === label)?.explanation;
  if (byLabel) return byLabel;
  return entries?.[positionalIndex]?.explanation ?? '';
}

function mapDiscovery(client: SanityClient, raw: RawDiscovery): Discovery {
  if (!raw.domainId) throw new Error('Discovery is missing domainId.');
  const id = parseDiscoveryId(raw.domainId);
  const title = raw.title ?? '';
  return {
    id,
    slug: parseContentSlug(raw.slug || raw.domainId),
    title,
    subtitle: raw.subtitle ?? '',
    headlineFact: raw.headlineFact ?? '',
    explanation: raw.explanation ?? '',
    deeperExplanation: pickExplanation(raw.additionalExplanations, 'Go deeper', 0),
    advancedExplanation: pickExplanation(raw.additionalExplanations, 'Advanced', 1),
    images: (raw.images ?? [])
      .map((image) => mapImage(client, image, title))
      .filter((image): image is ContentImage => image !== null),
    fallbackEmoji: raw.emojiFallback?.trim() || '✨',
    estimatedReadingSeconds: raw.estimatedSeconds ?? 60,
    lifecycle: 'published',
    // Not currently read by any gating logic (unlike LearningPack/World.revision) —
    // present only because the domain type requires it. See computeContentRevision.
    revision: computeContentRevision(id, []),
  };
}

/**
 * Maps a full CONTENT_SNAPSHOT_QUERY result into a ContentSnapshot. Throws on
 * any malformed individual document (missing domainId, invalid ID syntax via
 * parse*Id) rather than skipping it — the caller must treat any throw here as
 * "reject the entire remote snapshot," per Phase 11C.2 §35's "malformed
 * snapshot rejects entirely, never partially."
 */
export function mapContentSnapshot(
  client: SanityClient,
  raw: RawContentSnapshot,
  context: { dataset: string; fetchedAt: string },
): ContentSnapshot {
  const discoveries = raw.discoveries.map((discovery) => mapDiscovery(client, discovery));

  const packMemberships: LearningPackDiscovery[] = [];
  const learningPacks: LearningPack[] = raw.learningPacks.map((rawPack) => {
    if (!rawPack.domainId) throw new Error('Learning Pack is missing domainId.');
    if (!rawPack.worldDomainId) {
      throw new Error(`Learning Pack ${rawPack.domainId} has no World reference.`);
    }
    const packId = parseLearningPackId(rawPack.domainId);
    const worldId = parseWorldId(rawPack.worldDomainId);

    const memberships = (rawPack.memberships ?? [])
      .filter((membership) => membership.discoveryPublished && membership.discoveryDomainId)
      .map((membership, index): LearningPackDiscovery => ({
        learningPackId: packId,
        discoveryId: parseDiscoveryId(membership.discoveryDomainId!),
        position: index + 1,
        completionRole: membership.completionRole === 'optional' ? 'optional' : 'required',
      }));
    for (const membership of memberships) packMemberships.push(membership);

    const requiredDiscoveryIds = memberships
      .filter((membership) => membership.completionRole === 'required')
      .map((membership) => membership.discoveryId);
    const accessType = rawPack.accessType === 'paid' ? 'paid' : 'free';

    return {
      id: packId,
      slug: parseContentSlug(rawPack.slug || rawPack.domainId),
      worldId,
      title: rawPack.title ?? '',
      subtitle: rawPack.subtitle ?? '',
      sortOrder: rawPack.displayOrder ?? 0,
      accessType,
      // Sanity's accessType is metadata only; the commerceKey — and therefore
      // entitlement authority — stays engineering-owned in commerce/catalogue.ts.
      // Content can never grant itself an unlock (Phase 11C.2 §80).
      commerceKey: accessType === 'paid' ? getCommerceKeyForLearningPack(packId) : undefined,
      completionRole: rawPack.worldCompletionRole === 'optional' ? 'optional' : 'required',
      lifecycle: 'published',
      revision: computeContentRevision(packId, requiredDiscoveryIds),
    };
  });

  const requiredPackIdsByWorld = new Map<string, string[]>();
  for (const pack of learningPacks) {
    if (pack.completionRole !== 'required') continue;
    const list = requiredPackIdsByWorld.get(pack.worldId) ?? [];
    list.push(pack.id);
    requiredPackIdsByWorld.set(pack.worldId, list);
  }

  const worlds: World[] = raw.worlds.map((rawWorld) => {
    if (!rawWorld.domainId) throw new Error('World is missing domainId.');
    const worldId = parseWorldId(rawWorld.domainId);
    const title = rawWorld.title ?? '';
    return {
      id: worldId,
      slug: parseContentSlug(rawWorld.slug || rawWorld.domainId),
      title,
      tagline: rawWorld.tagline ?? '',
      themeKey: rawWorld.themeKey ?? '',
      badge: mapBadge(client, rawWorld.badge, title),
      sortOrder: rawWorld.displayOrder ?? 0,
      lifecycle: 'published',
      revision: computeContentRevision(worldId, requiredPackIdsByWorld.get(worldId) ?? []),
    };
  });

  return {
    schemaVersion: CONTENT_SNAPSHOT_SCHEMA_VERSION,
    dataset: context.dataset,
    fetchedAt: context.fetchedAt,
    source: 'sanity',
    worlds,
    learningPacks,
    discoveries,
    packMemberships,
  };
}
