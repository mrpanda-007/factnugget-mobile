import type { WorldId } from '@constants/tokens';
import type { ExplorerIdentityOption } from '@app-types/ExplorerIdentity';

/**
 * The 4 explorer identities offered on docs/design/01-screen-map.md's
 * Explorer Identity Selection screen — a local cosmetic choice, not a
 * profile. See types/ExplorerIdentity.ts for why nothing is collected here.
 */
export const explorerIdentityOptions: ExplorerIdentityOption[] = [
  {
    id: 'animal',
    label: 'Animal Explorer',
    emoji: '🐘',
    description: 'Discover amazing creatures big and small.',
  },
  {
    id: 'space',
    label: 'Space Explorer',
    emoji: '🚀',
    description: 'Blast off to planets, stars, and galaxies.',
  },
  {
    id: 'ocean',
    label: 'Ocean Explorer',
    emoji: '🌊',
    description: "Dive deep into the ocean's biggest secrets.",
  },
  {
    id: 'world',
    label: 'World Explorer',
    emoji: '🌎',
    description: 'Explore wonders from every corner of Earth.',
  },
];

/** Which WorldTheme (constants/tokens.ts) colors each identity's Avatar/ExplorerCharacter. */
export const identityWorldId: Record<ExplorerIdentityOption['id'], WorldId> = {
  animal: 'animal',
  space: 'space',
  ocean: 'ocean',
  world: 'earth',
};
