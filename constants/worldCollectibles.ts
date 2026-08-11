import type { WorldId } from '@constants/tokens';

/**
 * Presentation-only journey rewards. Deck completion remains persisted by the
 * SQLite progress repository; this mapping gives completed worlds a consistent
 * physical form without introducing a second source of truth or a new schema.
 */
export interface WorldCollectible {
  name: string;
  description: string;
  shelfLabel: string;
}

export const worldCollectibles: Record<WorldId, WorldCollectible> = {
  dinosaur: {
    name: 'Ancient Amber Fossil',
    description: 'A warm amber specimen holding a tiny trace of the giant world you explored.',
    shelfLabel: 'Amber Fossil',
  },
  ocean: {
    name: 'Pearl Current Shell',
    description: 'A sea-glass shell polished by a very long ocean journey.',
    shelfLabel: 'Current Shell',
  },
  space: {
    name: 'Starlit Meteor Fragment',
    description: 'A small piece of sky, collected from the edge of the stars.',
    shelfLabel: 'Meteor Fragment',
  },
  animal: {
    name: 'Forest Trail Token',
    description: 'A carved woodland token that remembers every creature you met.',
    shelfLabel: 'Trail Token',
  },
  earth: {
    name: 'Explorer’s Compass Stone',
    description: 'A tiny compass stone for all the wonderful places still ahead.',
    shelfLabel: 'Compass Stone',
  },
};
