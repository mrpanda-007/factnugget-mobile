import type { WorldId } from '@constants/tokens';
import * as ContentService from '@services/ContentService';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';

/**
 * The only module screens/hooks call for content — never ContentService or
 * Sanity directly (docs/implementation/01-project-architecture.md#repositories-layer).
 */

export function getCategories(): Promise<Category[]> {
  return ContentService.fetchCategories();
}

export function getCategory(categoryId: WorldId): Promise<Category | null> {
  return ContentService.fetchCategory(categoryId);
}

export function getDecksForCategory(categoryId: WorldId): Promise<Deck[]> {
  return ContentService.fetchDecksForCategory(categoryId);
}

export function getDeck(deckId: string): Promise<Deck | null> {
  return ContentService.fetchDeck(deckId);
}

export function getDiscoveriesForDeck(deckId: string): Promise<Discovery[]> {
  return ContentService.fetchDiscoveriesForDeck(deckId);
}

export function getDiscovery(discoveryId: string): Promise<Discovery | null> {
  return ContentService.fetchDiscovery(discoveryId);
}
