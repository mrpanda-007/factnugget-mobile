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
    label: 'Animal Look',
    emoji: '🐘',
    description: 'A warm, playful look with a friendly elephant.',
  },
  {
    id: 'space',
    label: 'Space Look',
    emoji: '🚀',
    description: 'A bright, adventurous look with a speedy rocket.',
  },
  {
    id: 'ocean',
    label: 'Ocean Look',
    emoji: '🌊',
    description: 'A calm, curious look with an ocean wave.',
  },
  {
    id: 'world',
    label: 'World Look',
    emoji: '🌎',
    description: 'A bold look for exploring a world of wonders.',
  },
];

/** Which WorldTheme (constants/tokens.ts) colors each identity's Avatar/ExplorerCharacter. */
export const identityWorldId: Record<ExplorerIdentityOption['id'], WorldId> = {
  animal: 'animal',
  space: 'space',
  ocean: 'ocean',
  world: 'earth',
};
