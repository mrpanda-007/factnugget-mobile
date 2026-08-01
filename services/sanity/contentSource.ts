import type { WorldId } from '@constants/tokens';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';

import { getSanityClient } from './client';
import { mapCategory, mapDeck, mapDiscovery } from './mappers';
import {
  CATEGORIES_QUERY,
  CATEGORY_QUERY,
  DECKS_FOR_CATEGORY_QUERY,
  DECK_QUERY,
  DISCOVERIES_FOR_DECK_QUERY,
  DISCOVERY_QUERY,
  SYNC_MANIFEST_QUERY,
} from './queries';

/**
 * The Sanity-backed implementation of the Content Service contract.
 *
 * Function-for-function identical to the mock implementation in
 * `services/ContentService.ts`, so the two are interchangeable and the swap is
 * invisible above this layer.
 *
 * WHERE THIS SITS
 *   UI → ContentRepository → ContentService → [SQLite cache] → THIS FILE → CDN
 *
 * The SQLite cache step is not yet built (06-content-sync-engine.md is a later
 * phase). Until it is, these functions hit the network directly. That is fine
 * for development and wrong for production — the offline-first guarantee is not
 * satisfied until the cache lands between here and ContentService.
 */

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchCategories(): Promise<Category[]> {
  const raw = await getSanityClient().fetch(CATEGORIES_QUERY);
  return (raw ?? []).map(mapCategory);
}

export async function fetchCategory(categoryId: WorldId): Promise<Category | null> {
  const raw = await getSanityClient().fetch(CATEGORY_QUERY, { categoryId });
  return raw ? mapCategory(raw) : null;
}

/* -------------------------------------------------------------------------- */
/* Decks                                                                       */
/* -------------------------------------------------------------------------- */

export async function fetchDecksForCategory(categoryId: WorldId): Promise<Deck[]> {
  const raw = await getSanityClient().fetch(DECKS_FOR_CATEGORY_QUERY, { categoryId });
  return (raw ?? []).map(mapDeck);
}

export async function fetchDeck(deckId: string): Promise<Deck | null> {
  const raw = await getSanityClient().fetch(DECK_QUERY, { deckId });
  return raw ? mapDeck(raw) : null;
}

/* -------------------------------------------------------------------------- */
/* Discoveries                                                                 */
/* -------------------------------------------------------------------------- */

export async function fetchDiscoveriesForDeck(deckId: string): Promise<Discovery[]> {
  const raw = await getSanityClient().fetch(DISCOVERIES_FOR_DECK_QUERY, { deckId });
  return (raw ?? []).map(mapDiscovery);
}

export async function fetchDiscovery(discoveryId: string): Promise<Discovery | null> {
  const raw = await getSanityClient().fetch(DISCOVERY_QUERY, { discoveryId });
  return raw ? mapDiscovery(raw) : null;
}

/* -------------------------------------------------------------------------- */
/* Sync engine                                                                 */
/* -------------------------------------------------------------------------- */

export interface SyncManifestEntry {
  id: string;
  version: string;
}

export interface SyncManifest {
  categories: SyncManifestEntry[];
  decks: SyncManifestEntry[];
  discoveries: SyncManifestEntry[];
  stickers: SyncManifestEntry[];
}

/**
 * Fetches the id+version manifest for every published document.
 *
 * The entry point for delta sync: diff this against the versions held in
 * SQLite, and fetch only what differs. Deliberately small enough to request on
 * every app launch without thinking about it.
 */
export async function fetchSyncManifest(): Promise<SyncManifest> {
  return getSanityClient().fetch(SYNC_MANIFEST_QUERY);
}
