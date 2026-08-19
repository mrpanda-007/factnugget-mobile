import type { WorldId } from '@constants/tokens';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';
import {
  oceanCategory,
  oceanDiscoveries,
  oceanSecretsDeck,
} from '@services/mock/oceanWorldContent';
import {
  spaceAdventuresDeck,
  spaceCategory,
  spaceDiscoveries,
} from '@services/mock/spaceWorldContent';

/**
 * The bundled offline/emergency-fallback content source — real, fact-checked
 * copy, not placeholder text.
 *
 * This is no longer the app's normal runtime authority. Live editorial
 * content flows through the canonical pipeline instead:
 *
 *   UI → ContentRepositoryContract → application/content/contentRuntime.ts
 *     → infrastructure/sanity (live) OR this module, via
 *       repositories/adapters/LegacyContentRepositoryAdapter.ts (offline starter)
 *
 * This module survives only as that adapter's backing data. A previous
 * `EXPO_PUBLIC_CONTENT_SOURCE=sanity` option here queried a Sanity schema
 * (`explorerWorld`/`deck`/`workflow.status`) that predates the canonical
 * Phase 5C content model and no longer exists — it was removed rather than
 * left as a silently-broken footgun. Configure Sanity via
 * EXPO_PUBLIC_SANITY_PROJECT_ID/EXPO_PUBLIC_SANITY_DATASET instead (see
 * infrastructure/sanity/sanityEnv.ts).
 */

const categories: Category[] = [oceanCategory, spaceCategory];
const decks: Deck[] = [oceanSecretsDeck, spaceAdventuresDeck];
const discoveries: Discovery[] = [...oceanDiscoveries, ...spaceDiscoveries];

export async function fetchCategories(): Promise<Category[]> {
  return categories;
}

export async function fetchCategory(categoryId: WorldId): Promise<Category | null> {
  return categories.find((category) => category.id === categoryId) ?? null;
}

export async function fetchDecksForCategory(categoryId: WorldId): Promise<Deck[]> {
  return decks.filter((deck) => deck.category === categoryId);
}

export async function fetchDeck(deckId: string): Promise<Deck | null> {
  return decks.find((deck) => deck.id === deckId) ?? null;
}

export async function fetchDiscoveriesForDeck(deckId: string): Promise<Discovery[]> {
  return discoveries
    .filter((discovery) => discovery.deck === deckId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function fetchDiscovery(discoveryId: string): Promise<Discovery | null> {
  return discoveries.find((discovery) => discovery.id === discoveryId) ?? null;
}
