import type { ContentRepositoryContract } from '@repositories/contracts/ContentRepositoryContract';
import { createSanityContentClient } from '../../infrastructure/sanity/sanityClient';
import { fetchRemoteSnapshot } from '../../infrastructure/sanity/fetchRemoteSnapshot';
import { getSanityEnv, type SanityEnv } from '../../infrastructure/sanity/sanityEnv';

import { getBundledStarterContentRepository } from './bundledStarterContent';
import { readCachedSnapshot, writeCachedSnapshot } from './contentCache';
import { contentError, type ContentError } from './contentErrors';
import { SnapshotContentRepository } from './SnapshotContentRepository';
import type { ContentSnapshot } from './contentSnapshot';

export type ContentSource = 'bundled' | 'cache' | 'sanity-refresh';

export interface ResolvedContentDataset {
  dataset: string;
  projectId: string;
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * The dataset-routing policy (Phase 11C.2 §24/§59/§102).
 *
 * Development trusts whatever EXPO_PUBLIC_SANITY_DATASET says — including
 * "production", which is this project's actual current .env default, and is a
 * legitimate choice: a developer testing against live canonical content is
 * not a leak. What must never happen is the reverse: a RELEASE build must
 * never resolve any dataset other than the literal string "production". A
 * missing, blank, or misspelled value degrades to `null` (→ bundled starter),
 * never to "development" (STOP condition B).
 */
export function resolveContentDataset(
  isDevelopment: boolean = isDevelopmentBuild(),
  env: SanityEnv = getSanityEnv(),
): ResolvedContentDataset | null {
  if (!env.projectId || !env.configuredDataset) return null;
  if (!isDevelopment && env.configuredDataset !== 'production') return null;
  return { dataset: env.configuredDataset, projectId: env.projectId };
}

let activeSnapshot: ContentSnapshot | null = null;
let activeRepository: ContentRepositoryContract = getBundledStarterContentRepository();
let activeSource: ContentSource = 'bundled';
let hydrated = false;
let refreshInFlight: Promise<{ ok: true } | { ok: false; error: ContentError }> | null = null;

function activateSnapshot(snapshot: ContentSnapshot, source: ContentSource): void {
  activeSnapshot = snapshot;
  activeRepository = new SnapshotContentRepository(() => activeSnapshot!);
  activeSource = source;
}

/**
 * Never touches the network or SQLite — always returns whatever is currently
 * active (bundled at cold boot, cache or Sanity shortly after). Safe to call
 * from the earliest render; child startup never waits on this (Phase 11C.2
 * §55/§83).
 */
export function getContentRepository(): ContentRepositoryContract {
  return activeRepository;
}

/**
 * A stable object composition roots can hold onto for the app's lifetime.
 * `getContentRepository()` returns whichever repository is active RIGHT NOW —
 * capturing that return value once at module-init (as commerceRuntime.ts and
 * discoveryProgressRuntime.ts both do) would freeze callers onto the bundled
 * starter forever, since hydration/refresh swap the active repository
 * asynchronously, after those modules have already run. Every method here
 * instead delegates to getContentRepository() at CALL time, so it always sees
 * the current one without callers needing to know a swap happened.
 */
export const liveContentRepository: ContentRepositoryContract = {
  listWorlds: () => getContentRepository().listWorlds(),
  getWorld: (worldId) => getContentRepository().getWorld(worldId),
  listLearningPacksForWorld: (worldId) => getContentRepository().listLearningPacksForWorld(worldId),
  getLearningPack: (learningPackId) => getContentRepository().getLearningPack(learningPackId),
  listPackDiscoveries: (learningPackId) =>
    getContentRepository().listPackDiscoveries(learningPackId),
  getDiscovery: (discoveryId) => getContentRepository().getDiscovery(discoveryId),
};

/** Dev-only diagnostic (Phase 11C.2 §95) — never surfaced to a child. */
export function getActiveContentSource(): ContentSource {
  return activeSource;
}

/**
 * Activates the last-known-good cache over the bundled starter, if one exists
 * and is still valid. Local SQLite only — no network — so this is fast enough
 * to await during startup hydration alongside the rest of the app's own SQLite
 * hydration, without delaying first paint on a network round trip.
 */
export async function hydrateContentRuntime(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const cached = await readCachedSnapshot();
    if (cached) activateSnapshot(cached, 'cache');
  } catch {
    // A cache read failure must never block the child app — bundled stays active.
  }
}

async function performRefresh(): Promise<{ ok: true } | { ok: false; error: ContentError }> {
  const resolved = resolveContentDataset();
  if (!resolved) {
    return {
      ok: false,
      error: contentError('notConfigured', 'Sanity is not configured for this build/dataset.'),
    };
  }

  const client = createSanityContentClient(resolved.dataset, resolved.projectId);
  const result = await fetchRemoteSnapshot(client, resolved.dataset);
  if (!result.ok) return result;

  // Activate first: a later cache-write failure must not undo an already
  // validated, already-active snapshot for this session (Phase 11C.2 §53/§74).
  activateSnapshot(result.snapshot, 'sanity-refresh');
  try {
    await writeCachedSnapshot(result.snapshot);
  } catch {
    // Swallowed deliberately — see comment above.
  }
  return { ok: true };
}

/**
 * Coalesced: concurrent callers (app foreground + a manual dev refresh, say)
 * share one in-flight request rather than firing duplicate fetches (Phase
 * 11C.2 §58). A failure never touches the currently active repository —
 * network loss or a malformed remote snapshot leaves content exactly as it
 * was (Phase 11C.2 §44/§45).
 */
export function refreshContent(): Promise<{ ok: true } | { ok: false; error: ContentError }> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Test-only: this module is a singleton composition root by design (matches commerceRuntime.ts). */
export function __resetContentRuntimeForTests(): void {
  activeSnapshot = null;
  activeRepository = getBundledStarterContentRepository();
  activeSource = 'bundled';
  hydrated = false;
  refreshInFlight = null;
}
