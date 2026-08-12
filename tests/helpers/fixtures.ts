import type {
  Discovery,
  LearningPack,
  LearningPackDiscovery,
  World,
} from '../../types/domain/content';
import {
  parseContentSlug,
  parseDiscoveryId,
  parseLearningPackId,
  parseWorldId,
} from '../../types/domain/ids';
import type { InMemoryContentSeed } from './InMemoryRepositories';

export const oceanWorldId = parseWorldId('ocean');
export const oceanGiantsPackId = parseLearningPackId('ocean-giants');
export const amazingMammalsPackId = parseLearningPackId('amazing-mammals');
export const optionalPackId = parseLearningPackId('ocean-extras');
export const blueWhaleId = parseDiscoveryId('blue-whale');
export const sharkId = parseDiscoveryId('shark');
export const dolphinId = parseDiscoveryId('dolphin');
export const octopusId = parseDiscoveryId('octopus');

export function makeWorld(id = 'ocean', revision = 'world-1'): World {
  return {
    id: parseWorldId(id),
    slug: parseContentSlug(id),
    title: `${id} World`,
    tagline: `Explore ${id}`,
    themeKey: id,
    badge: {
      title: `${id} Explorer Badge`,
      icon: '🏆',
      accessibleDescription: `${id} Explorer Badge`,
    },
    sortOrder: 1,
    lifecycle: 'published',
    revision,
  };
}

export function makePack(
  id: string,
  sortOrder: number,
  completionRole: 'required' | 'optional' = 'required',
): LearningPack {
  return {
    id: parseLearningPackId(id),
    slug: parseContentSlug(id),
    worldId: oceanWorldId,
    title: id,
    subtitle: `Learn about ${id}`,
    sortOrder,
    accessType: 'free',
    completionRole,
    lifecycle: 'published',
    revision: `${id}-1`,
  };
}

export function makeDiscovery(id: string): Discovery {
  return {
    id: parseDiscoveryId(id),
    slug: parseContentSlug(id),
    title: id,
    subtitle: `Meet ${id}`,
    headlineFact: `${id} fact`,
    explanation: `${id} explanation`,
    deeperExplanation: `${id} deeper explanation`,
    advancedExplanation: `${id} advanced explanation`,
    images: [],
    fallbackEmoji: '🔎',
    estimatedReadingSeconds: 30,
    lifecycle: 'published',
    revision: `${id}-1`,
  };
}

export function membership(
  learningPackId: string,
  discoveryId: string,
  position: number,
  completionRole: 'required' | 'optional' = 'required',
): LearningPackDiscovery {
  return {
    learningPackId: parseLearningPackId(learningPackId),
    discoveryId: parseDiscoveryId(discoveryId),
    position,
    completionRole,
  };
}

/** Shared Blue Whale appears in both Packs but has one canonical Discovery record. */
export function sharedDiscoverySeed(): InMemoryContentSeed {
  const worlds = [makeWorld()];
  const learningPacks = [makePack('ocean-giants', 1), makePack('amazing-mammals', 2)];
  const discoveries = [
    makeDiscovery('blue-whale'),
    makeDiscovery('shark'),
    makeDiscovery('dolphin'),
  ];
  const memberships: LearningPackDiscovery[] = [
    membership('ocean-giants', 'blue-whale', 1),
    membership('ocean-giants', 'shark', 2),
    membership('amazing-mammals', 'blue-whale', 1),
    membership('amazing-mammals', 'dolphin', 2),
  ];
  return { worlds, learningPacks, discoveries, memberships };
}
