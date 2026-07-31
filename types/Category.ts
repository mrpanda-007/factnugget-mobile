import type { WorldId } from '@constants/tokens';
import type { ContentStatus } from '@app-types/Discovery';

/**
 * A "World" in product/design terms (docs/design/01-screen-map.md) — called
 * `Category` in code to match docs/implementation/04-content-platform.md's
 * Category → Deck → Discoveries hierarchy. Visual theming for `id` lives in
 * `constants/tokens.ts#worldThemes` — this type only carries content-side data.
 */
export interface Category {
  id: WorldId;
  title: string;
  tagline: string;
  deckIds: string[];
  version: string;
  status: ContentStatus;
}
