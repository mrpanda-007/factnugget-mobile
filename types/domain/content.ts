import type { ContentSlug, DiscoveryId, LearningPackId, WorldId } from './ids';

export type ContentLifecycle = 'published' | 'retired';
export type ContentAccessType = 'free' | 'paid';
export type CompletionRole = 'required' | 'optional';

export interface ContentImage {
  url: string;
  accessibleDescription: string;
}

/** A World owns exactly one Badge definition. Earning is recorded separately. */
export interface WorldBadge {
  title: string;
  icon: string;
  accessibleDescription: string;
}

export interface World {
  id: WorldId;
  slug: ContentSlug;
  title: string;
  tagline: string;
  themeKey: string;
  badge: WorldBadge;
  sortOrder: number;
  lifecycle: ContentLifecycle;
  revision: string;
}

export interface LearningPack {
  id: LearningPackId;
  slug: ContentSlug;
  worldId: WorldId;
  title: string;
  subtitle: string;
  sortOrder: number;
  accessType: ContentAccessType;
  completionRole: CompletionRole;
  lifecycle: ContentLifecycle;
  revision: string;
}

/** The canonical N:M join. Pack order and Pack completion semantics live here. */
export interface LearningPackDiscovery {
  learningPackId: LearningPackId;
  discoveryId: DiscoveryId;
  position: number;
  completionRole: CompletionRole;
}

/**
 * A Discovery is the whole learning experience. It does not own a World,
 * Learning Pack, or display order and can therefore be reused safely.
 */
export interface Discovery {
  id: DiscoveryId;
  slug: ContentSlug;
  title: string;
  subtitle: string;
  headlineFact: string;
  explanation: string;
  deeperExplanation: string;
  advancedExplanation: string;
  images: ContentImage[];
  fallbackEmoji: string;
  estimatedReadingSeconds: number;
  lifecycle: ContentLifecycle;
  revision: string;
}

export interface PackDiscovery {
  membership: LearningPackDiscovery;
  discovery: Discovery;
}
