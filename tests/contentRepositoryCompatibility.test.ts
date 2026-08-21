import { describe, expect, it, vi } from 'vitest';

import { parseDiscoveryId, parseLearningPackId, parseWorldId } from '../types/domain/ids';

import * as ContentRepository from '../repositories/ContentRepository';

const world = {
  id: parseWorldId('ocean'),
  slug: 'ocean-world' as never,
  title: 'Ocean World from Sanity',
  tagline: 'A live editorial world.',
  themeKey: 'ocean',
  badge: {
    title: 'Ocean Explorer Badge',
    icon: '🏆',
    accessibleDescription: 'Ocean Explorer Badge',
  },
  sortOrder: 1,
  lifecycle: 'published' as const,
  revision: 'world-revision',
};
const pack = {
  id: parseLearningPackId('ocean-secrets'),
  slug: 'ocean-secrets' as never,
  worldId: world.id,
  title: 'Ocean Secrets from Sanity',
  subtitle: 'Learn about the deep.',
  sortOrder: 1,
  accessType: 'free' as const,
  completionRole: 'required' as const,
  lifecycle: 'published' as const,
  revision: 'pack-revision',
};
const discovery = {
  id: parseDiscoveryId('octopus'),
  slug: 'octopus' as never,
  title: 'Octopus from Sanity',
  subtitle: 'A clever ocean explorer.',
  headlineFact: 'Octopuses have three hearts.',
  explanation: 'A short explanation.',
  deeperExplanation: 'A deeper explanation.',
  advancedExplanation: 'An advanced explanation.',
  images: [{ url: 'https://cdn.example.test/octopus.jpg', accessibleDescription: 'An octopus' }],
  fallbackEmoji: '🐙',
  estimatedReadingSeconds: 42,
  lifecycle: 'published' as const,
  revision: 'discovery-revision',
};

vi.mock('../application/content/contentRuntime', () => ({
  liveContentRepository: {
    listWorlds: vi.fn(async () => [world]),
    getWorld: vi.fn(async (id: string) => (id === world.id ? world : null)),
    listLearningPacksForWorld: vi.fn(async (id: string) => (id === world.id ? [pack] : [])),
    getLearningPack: vi.fn(async (id: string) => (id === pack.id ? pack : null)),
    listPackDiscoveries: vi.fn(async (id: string) =>
      id === pack.id
        ? [
            {
              membership: {
                learningPackId: pack.id,
                discoveryId: discovery.id,
                position: 1,
                completionRole: 'required',
              },
              discovery,
            },
          ]
        : [],
    ),
    getDiscovery: vi.fn(async (id: string) => (id === discovery.id ? discovery : null)),
  },
}));

describe('legacy ContentRepository compatibility facade', () => {
  it('maps the active Sanity/cache runtime into the old UI data shape', async () => {
    await expect(ContentRepository.getCategories()).resolves.toMatchObject([
      { id: 'ocean', title: 'Ocean World from Sanity', deckIds: ['ocean-secrets'] },
    ]);
    await expect(ContentRepository.getDeck('ocean-secrets')).resolves.toMatchObject({
      title: 'Ocean Secrets from Sanity',
      discoveryIds: ['octopus'],
    });
    await expect(ContentRepository.getDiscovery('octopus')).resolves.toMatchObject({
      title: 'Octopus from Sanity',
      deck: 'ocean-secrets',
      heroImage: 'https://cdn.example.test/octopus.jpg',
      easyDescription: 'A short explanation.',
    });
  });
});
