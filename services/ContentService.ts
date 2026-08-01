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
import { isSanityConfigured } from '@services/sanity/client';
import * as sanitySource from '@services/sanity/contentSource';

/**
 * The Content Service — the single seam between the app and where content
 * comes from.
 *
 * Per docs/implementation/04-content-platform.md the full chain is:
 *
 *   UI → ContentRepository → ContentService → SQLite cache → Sanity CDN
 *
 * ContentRepository (repositories/ContentRepository.ts) is the only legitimate
 * caller; no screen should import this directly.
 *
 * ── CHOOSING A SOURCE ───────────────────────────────────────────────────────
 * Two implementations exist and are interchangeable:
 *
 *   mock    — bundled content in `services/mock/`. Real, fact-checked copy,
 *             not lorem ipsum; usable as launch content for the Ocean pack.
 *   sanity  — live content from the Studio (`studio-factnuggets`).
 *
 * The default is `mock`, deliberately. It keeps the app working with no `.env`,
 * no network and no published content — which is the state a new developer
 * clones into, and the state the project is in until content is authored.
 *
 * Switch with `EXPO_PUBLIC_CONTENT_SOURCE=sanity` in `.env`.
 *
 * ⚠️ The `sanity` path currently reads straight from the CDN. The SQLite cache
 * that makes this offline-first (06-content-sync-engine.md) is not built yet;
 * until it is, `sanity` means "online only" and is a development mode, not a
 * shippable one.
 */

type ContentSourceName = 'mock' | 'sanity';

const configuredSource = process.env.EXPO_PUBLIC_CONTENT_SOURCE as ContentSourceName | undefined;

/**
 * Falls back to mock when Sanity is requested but not configured, rather than
 * throwing. A missing env var should degrade to a working app, not a blank
 * screen — this is a product for children, and "no content at all" is the worst
 * failure mode available.
 */
export const activeContentSource: ContentSourceName =
  configuredSource === 'sanity' && isSanityConfigured ? 'sanity' : 'mock';

if (configuredSource === 'sanity' && !isSanityConfigured) {
  console.warn(
    '[ContentService] EXPO_PUBLIC_CONTENT_SOURCE=sanity but no Sanity project id/dataset is set. Falling back to bundled mock content.',
  );
}

/* -------------------------------------------------------------------------- */
/* Mock implementation                                                         */
/* -------------------------------------------------------------------------- */

const categories: Category[] = [oceanCategory, spaceCategory];
const decks: Deck[] = [oceanSecretsDeck, spaceAdventuresDeck];
const discoveries: Discovery[] = [...oceanDiscoveries, ...spaceDiscoveries];

const mockSource = {
  async fetchCategories(): Promise<Category[]> {
    return categories;
  },
  async fetchCategory(categoryId: WorldId): Promise<Category | null> {
    return categories.find((category) => category.id === categoryId) ?? null;
  },
  async fetchDecksForCategory(categoryId: WorldId): Promise<Deck[]> {
    return decks.filter((deck) => deck.category === categoryId);
  },
  async fetchDeck(deckId: string): Promise<Deck | null> {
    return decks.find((deck) => deck.id === deckId) ?? null;
  },
  async fetchDiscoveriesForDeck(deckId: string): Promise<Discovery[]> {
    return discoveries
      .filter((discovery) => discovery.deck === deckId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
  async fetchDiscovery(discoveryId: string): Promise<Discovery | null> {
    return discoveries.find((discovery) => discovery.id === discoveryId) ?? null;
  },
};

/* -------------------------------------------------------------------------- */
/* Public API — identical signatures whichever source is active                */
/* -------------------------------------------------------------------------- */

const source = activeContentSource === 'sanity' ? sanitySource : mockSource;

export async function fetchCategories(): Promise<Category[]> {
  return source.fetchCategories();
}

export async function fetchCategory(categoryId: WorldId): Promise<Category | null> {
  return source.fetchCategory(categoryId);
}

export async function fetchDecksForCategory(categoryId: WorldId): Promise<Deck[]> {
  return source.fetchDecksForCategory(categoryId);
}

export async function fetchDeck(deckId: string): Promise<Deck | null> {
  return source.fetchDeck(deckId);
}

export async function fetchDiscoveriesForDeck(deckId: string): Promise<Discovery[]> {
  return source.fetchDiscoveriesForDeck(deckId);
}

export async function fetchDiscovery(discoveryId: string): Promise<Discovery | null> {
  return source.fetchDiscovery(discoveryId);
}
