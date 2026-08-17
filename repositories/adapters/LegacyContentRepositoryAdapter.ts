import type { Category } from '../../types/Category';
import type { Deck } from '../../types/Deck';
import type { Discovery as LegacyDiscovery } from '../../types/Discovery';
import type { WorldId as LegacyWorldId } from '../../constants/tokens';
import type { ContentRepositoryContract } from '../contracts/ContentRepositoryContract';
import type {
  Discovery,
  LearningPack,
  PackDiscovery,
  World,
  WorldBadge,
} from '../../types/domain/content';
import {
  parseContentSlug,
  parseDiscoveryId,
  parseLearningPackId,
  parseWorldId,
  type DiscoveryId,
  type LearningPackId,
  type WorldId,
} from '../../types/domain/ids';
import * as LegacyContentRepository from '../ContentRepository';
import { getCommerceKeyForLearningPack } from '../../commerce/catalogue';

interface LegacyContentSource {
  getCategories(): Promise<Category[]>;
  getCategory(categoryId: LegacyWorldId): Promise<Category | null>;
  getDecksForCategory(categoryId: LegacyWorldId): Promise<Deck[]>;
  getDeck(deckId: string): Promise<Deck | null>;
  getDiscoveriesForDeck(deckId: string): Promise<LegacyDiscovery[]>;
  getDiscovery(discoveryId: string): Promise<LegacyDiscovery | null>;
}

const fallbackBadge: WorldBadge = {
  title: 'World Explorer Badge',
  icon: '🏆',
  accessibleDescription: 'World Explorer Badge',
};

function toWorld(category: Category, badge: WorldBadge, sortOrder: number): World {
  return {
    id: parseWorldId(category.id),
    slug: parseContentSlug(category.id),
    title: category.title,
    tagline: category.tagline,
    themeKey: category.id,
    badge,
    sortOrder,
    lifecycle: 'published',
    revision: category.version,
  };
}

function toLearningPack(deck: Deck): LearningPack {
  return {
    id: parseLearningPackId(deck.id),
    slug: parseContentSlug(deck.slug),
    worldId: parseWorldId(deck.category),
    title: deck.title,
    subtitle: deck.subtitle,
    sortOrder: deck.displayOrder,
    accessType: deck.isFree ? 'free' : 'paid',
    commerceKey: deck.isFree
      ? undefined
      : getCommerceKeyForLearningPack(parseLearningPackId(deck.id)),
    completionRole: 'required',
    lifecycle: 'published',
    revision: deck.version,
  };
}

function toDiscovery(discovery: LegacyDiscovery): Discovery {
  return {
    id: parseDiscoveryId(discovery.id),
    slug: parseContentSlug(discovery.slug),
    title: discovery.title,
    subtitle: discovery.subtitle,
    headlineFact: discovery.funFact,
    explanation: discovery.easyDescription,
    deeperExplanation: discovery.mediumDescription,
    advancedExplanation: discovery.advancedDescription,
    images: discovery.images.map((url, index) => ({
      url,
      accessibleDescription: `${discovery.title} photo ${index + 1}`,
    })),
    fallbackEmoji: discovery.emoji,
    estimatedReadingSeconds: discovery.estimatedReadingTime,
    lifecycle: 'published',
    revision: discovery.version,
  };
}

/**
 * Read-only bridge from the currently shipped Category/Deck content shape to
 * Phase 5B contracts. Screens continue using the legacy repository for now.
 *
 * The old model stores a reward on each Deck. While only one Deck exists per
 * World, that first reward supplies the canonical World Badge. New content
 * should author the Badge on World directly. Per-Discovery stickers are never
 * mapped into the canonical domain.
 */
export class LegacyContentRepositoryAdapter implements ContentRepositoryContract {
  constructor(private readonly source: LegacyContentSource = LegacyContentRepository) {}

  async listWorlds(): Promise<World[]> {
    const categories = (await this.source.getCategories()).filter(
      (category) => category.status === 'published',
    );
    return Promise.all(
      categories.map(async (category, index) => {
        const decks = await this.source.getDecksForCategory(category.id);
        return toWorld(category, this.badgeFromDeck(decks[0]), index + 1);
      }),
    );
  }

  async getWorld(worldId: WorldId): Promise<World | null> {
    const legacyWorldId = worldId as unknown as LegacyWorldId;
    const category = await this.source.getCategory(legacyWorldId);
    if (!category || category.status !== 'published') return null;
    const decks = await this.source.getDecksForCategory(legacyWorldId);
    return toWorld(category, this.badgeFromDeck(decks[0]), 1);
  }

  async listLearningPacksForWorld(worldId: WorldId): Promise<LearningPack[]> {
    const decks = await this.source.getDecksForCategory(worldId as unknown as LegacyWorldId);
    return decks
      .filter((deck) => deck.status === 'published')
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map(toLearningPack);
  }

  async getLearningPack(learningPackId: LearningPackId): Promise<LearningPack | null> {
    const deck = await this.source.getDeck(learningPackId);
    return deck?.status === 'published' ? toLearningPack(deck) : null;
  }

  async listPackDiscoveries(learningPackId: LearningPackId): Promise<PackDiscovery[]> {
    const deck = await this.source.getDeck(learningPackId);
    if (!deck || deck.status !== 'published') return [];

    const discoveriesById = new Map(
      (await this.source.getDiscoveriesForDeck(deck.id))
        .filter((discovery) => discovery.status === 'published')
        .map((discovery) => [discovery.id, discovery]),
    );

    return deck.discoveryIds.flatMap((discoveryId, index) => {
      const discovery = discoveriesById.get(discoveryId);
      if (!discovery) return [];
      return [
        {
          membership: {
            learningPackId,
            discoveryId: parseDiscoveryId(discoveryId),
            position: index + 1,
            completionRole: 'required',
          },
          discovery: toDiscovery(discovery),
        },
      ];
    });
  }

  async getDiscovery(discoveryId: DiscoveryId): Promise<Discovery | null> {
    const discovery = await this.source.getDiscovery(discoveryId);
    return discovery?.status === 'published' ? toDiscovery(discovery) : null;
  }

  private badgeFromDeck(deck: Deck | undefined): WorldBadge {
    if (!deck) return fallbackBadge;
    return {
      title: deck.rewardBadge.label,
      icon: deck.rewardBadge.icon,
      accessibleDescription: deck.rewardBadge.label,
    };
  }
}
