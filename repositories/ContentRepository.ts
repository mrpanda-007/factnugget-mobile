import { liveContentRepository } from '../application/content/contentRuntime';
import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery, DiscoveryReward } from '@app-types/Discovery';
import type {
  Discovery as CanonicalDiscovery,
  LearningPack,
  World,
} from '@app-types/domain/content';
import type { WorldId as LegacyWorldId } from '@constants/tokens';

const legacyWorldIds = new Set<LegacyWorldId>(['ocean', 'space', 'dinosaur', 'animal', 'earth']);

function asLegacyWorldId(worldId: string): LegacyWorldId | null {
  return legacyWorldIds.has(worldId as LegacyWorldId) ? (worldId as LegacyWorldId) : null;
}

function toReward(title: string, icon: string): DiscoveryReward {
  return { label: title, icon };
}

async function packDiscoveries(pack: LearningPack) {
  return liveContentRepository.listPackDiscoveries(pack.id);
}

function toDeck(world: World, pack: LearningPack, discoveryIds: string[]): Deck {
  const category = asLegacyWorldId(world.id);
  if (!category) throw new Error(`World ${world.id} has no supported legacy visual theme.`);
  return {
    id: pack.id,
    slug: pack.slug,
    title: pack.title,
    subtitle: pack.subtitle,
    category,
    displayOrder: pack.sortOrder,
    discoveryIds,
    rewardBadge: toReward(world.badge.title, world.badge.icon),
    isFree: pack.accessType === 'free',
    version: pack.revision,
    status: 'published',
  };
}

function toDiscovery(discovery: CanonicalDiscovery, deck: Deck, displayOrder: number): Discovery {
  const images = discovery.images.map((image) => image.url);
  return {
    id: discovery.id,
    slug: discovery.slug,
    title: discovery.title,
    subtitle: discovery.subtitle,
    category: deck.category,
    deck: deck.id,
    displayOrder,
    heroImage: images[0] ?? null,
    emoji: discovery.fallbackEmoji,
    images,
    easyDescription: discovery.explanation,
    mediumDescription: discovery.deeperExplanation,
    advancedDescription: discovery.advancedExplanation,
    funFact: discovery.headlineFact,
    stickerReward: toReward(`${discovery.title} sticker`, discovery.fallbackEmoji),
    discoveryReward: toReward(`${discovery.title} discovery`, discovery.fallbackEmoji),
    estimatedReadingTime: discovery.estimatedReadingSeconds,
    tags: [],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: discovery.revision,
    status: 'published',
    // Canonical snapshots do not expose publishing timestamps. Preserve that
    // truth rather than inventing editorial dates from a sync timestamp.
    publishedAt: '',
    updatedAt: '',
  };
}

async function findPack(packId: string): Promise<{ world: World; pack: LearningPack } | null> {
  const worlds = await liveContentRepository.listWorlds();
  for (const world of worlds) {
    const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
    const pack = packs.find((candidate) => candidate.id === packId);
    if (pack) return { world, pack };
  }
  return null;
}

/**
 * Compatibility facade for pre-contract callers. Every read goes through the
 * active runtime: validated Sanity snapshot → local cache → bundled starter.
 * It contains no Sanity client and therefore cannot bypass CMS validation or
 * the safe offline fallback policy.
 */
export async function getCategories(): Promise<Category[]> {
  const worlds = await liveContentRepository.listWorlds();
  const categories = await Promise.all(
    worlds.map(async (world): Promise<Category | null> => {
      const id = asLegacyWorldId(world.id);
      if (!id) return null;
      const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
      return {
        id,
        title: world.title,
        tagline: world.tagline,
        deckIds: packs.map((pack) => pack.id),
        version: world.revision,
        status: 'published',
      };
    }),
  );
  return categories.filter((category): category is Category => category !== null);
}

export async function getCategory(categoryId: LegacyWorldId): Promise<Category | null> {
  const world = await liveContentRepository.getWorld(categoryId as never);
  if (!world || !asLegacyWorldId(world.id)) return null;
  const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
  return {
    id: categoryId,
    title: world.title,
    tagline: world.tagline,
    deckIds: packs.map((pack) => pack.id),
    version: world.revision,
    status: 'published',
  };
}

export async function getDecksForCategory(categoryId: LegacyWorldId): Promise<Deck[]> {
  const world = await liveContentRepository.getWorld(categoryId as never);
  if (!world || !asLegacyWorldId(world.id)) return [];
  const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
  return Promise.all(
    packs.map(async (pack) => {
      const discoveries = await packDiscoveries(pack);
      return toDeck(
        world,
        pack,
        discoveries.map(({ discovery }) => discovery.id),
      );
    }),
  );
}

export async function getDeck(deckId: string): Promise<Deck | null> {
  const found = await findPack(deckId);
  if (!found || !asLegacyWorldId(found.world.id)) return null;
  const discoveries = await packDiscoveries(found.pack);
  return toDeck(
    found.world,
    found.pack,
    discoveries.map(({ discovery }) => discovery.id),
  );
}

export async function getDiscoveriesForDeck(deckId: string): Promise<Discovery[]> {
  const deck = await getDeck(deckId);
  if (!deck) return [];
  const discoveries = await liveContentRepository.listPackDiscoveries(deckId as never);
  return discoveries.map(({ discovery }, index) => toDiscovery(discovery, deck, index + 1));
}

export async function getDiscovery(discoveryId: string): Promise<Discovery | null> {
  const worlds = await liveContentRepository.listWorlds();
  for (const world of worlds) {
    if (!asLegacyWorldId(world.id)) continue;
    const packs = await liveContentRepository.listLearningPacksForWorld(world.id);
    for (const pack of packs) {
      const discoveries = await packDiscoveries(pack);
      const index = discoveries.findIndex(({ discovery }) => discovery.id === discoveryId);
      if (index < 0) continue;
      const deck = toDeck(
        world,
        pack,
        discoveries.map(({ discovery }) => discovery.id),
      );
      return toDiscovery(discoveries[index].discovery, deck, index + 1);
    }
  }
  return null;
}
