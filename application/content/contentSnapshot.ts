import type {
  Discovery,
  LearningPack,
  LearningPackDiscovery,
  World,
} from '@app-types/domain/content';

/**
 * Bump only when the SHAPE of ContentSnapshot itself changes — not when
 * editorial content changes. A cached snapshot written by an older app version
 * whose shape this build no longer understands must be rejected, never parsed
 * optimistically (Phase 11C.2 §76).
 */
export const CONTENT_SNAPSHOT_SCHEMA_VERSION = 1;

export type ContentSnapshotSource = 'sanity' | 'bundled';

/**
 * A complete, self-consistent picture of canonical content at one instant.
 * Never partially populated — see validateContentSnapshot, which every
 * snapshot must pass before it is allowed to become the active one.
 */
export interface ContentSnapshot {
  schemaVersion: number;
  /** The Sanity dataset this came from, or 'bundled' for the starter snapshot. */
  dataset: string;
  fetchedAt: string;
  source: ContentSnapshotSource;
  worlds: World[];
  learningPacks: LearningPack[];
  discoveries: Discovery[];
  packMemberships: LearningPackDiscovery[];
}

export type ContentSnapshotValidation = { valid: true } | { valid: false; errors: string[] };

/**
 * Cross-document integrity only. Per-field shape (required strings, branded ID
 * syntax, URL well-formedness) is already enforced by the mapper that produced
 * each World/LearningPack/Discovery — a value that reaches this function is
 * already individually well-typed. This function's job is everything a single
 * document cannot know about itself: uniqueness and cross-references.
 *
 * Treat the input as untrusted CMS output regardless of source. A malformed
 * result must reject the ENTIRE snapshot — never adopt half of one (Phase
 * 11C.2 §35/§36).
 */
export function validateContentSnapshot(snapshot: ContentSnapshot): ContentSnapshotValidation {
  const errors: string[] = [];

  if (snapshot.schemaVersion !== CONTENT_SNAPSHOT_SCHEMA_VERSION) {
    errors.push(
      `Unknown snapshot schema version ${snapshot.schemaVersion}; this build understands ${CONTENT_SNAPSHOT_SCHEMA_VERSION}.`,
    );
    return { valid: false, errors };
  }

  const worldIds = new Set<string>();
  for (const world of snapshot.worlds) {
    if (worldIds.has(world.id)) errors.push(`Duplicate World id: ${world.id}`);
    worldIds.add(world.id);
    if (!world.title.trim()) errors.push(`World ${world.id} has an empty title.`);
    if (!world.badge.title.trim()) errors.push(`World ${world.id} Badge has an empty title.`);
  }

  const learningPackIds = new Set<string>();
  for (const pack of snapshot.learningPacks) {
    if (learningPackIds.has(pack.id)) errors.push(`Duplicate Learning Pack id: ${pack.id}`);
    learningPackIds.add(pack.id);
    if (!pack.title.trim()) errors.push(`Learning Pack ${pack.id} has an empty title.`);
    if (!worldIds.has(pack.worldId)) {
      errors.push(`Learning Pack ${pack.id} references missing World ${pack.worldId}.`);
    }
  }

  const discoveryIds = new Set<string>();
  for (const discovery of snapshot.discoveries) {
    if (discoveryIds.has(discovery.id)) errors.push(`Duplicate Discovery id: ${discovery.id}`);
    discoveryIds.add(discovery.id);
    if (!discovery.title.trim()) errors.push(`Discovery ${discovery.id} has an empty title.`);
    for (const image of discovery.images) {
      if (!image.accessibleDescription.trim()) {
        errors.push(`Discovery ${discovery.id} has an image with no accessible description.`);
      }
    }
  }

  const membershipsByPack = new Map<string, LearningPackDiscovery[]>();
  for (const membership of snapshot.packMemberships) {
    if (!learningPackIds.has(membership.learningPackId)) {
      errors.push(`Pack membership references missing Learning Pack ${membership.learningPackId}.`);
    }
    if (!discoveryIds.has(membership.discoveryId)) {
      errors.push(`Pack membership references missing Discovery ${membership.discoveryId}.`);
    }
    if (!Number.isInteger(membership.position) || membership.position < 0) {
      errors.push(
        `Pack membership ${membership.learningPackId}/${membership.discoveryId} has an invalid position.`,
      );
    }
    const list = membershipsByPack.get(membership.learningPackId) ?? [];
    list.push(membership);
    membershipsByPack.set(membership.learningPackId, list);
  }

  for (const [learningPackId, memberships] of membershipsByPack) {
    const discoveryIdsInPack = new Set<string>();
    for (const membership of memberships) {
      if (discoveryIdsInPack.has(membership.discoveryId)) {
        errors.push(
          `Discovery ${membership.discoveryId} appears more than once in Learning Pack ${learningPackId}.`,
        );
      }
      discoveryIdsInPack.add(membership.discoveryId);
    }
  }

  for (const pack of snapshot.learningPacks) {
    if (!membershipsByPack.get(pack.id)?.length) {
      errors.push(`Learning Pack ${pack.id} has no Discovery memberships.`);
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}
