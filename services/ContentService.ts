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
 * TEMPORARY — no Sanity project exists yet (self-plan.md Phase 5). This
 * returns local mock data shaped exactly like
 * docs/implementation/05-content-schema.md. Swap point for the real
 * implementation: docs/implementation/04-content-platform.md's
 * `UI → ContentRepository → ContentService → SQLite Cache → Sanity CDN`
 * chain — only this file's function bodies change when that lands.
 * ContentRepository (repositories/ContentRepository.ts) is the only caller;
 * no other module should import this directly.
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
