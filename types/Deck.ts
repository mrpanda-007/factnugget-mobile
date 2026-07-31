import type { WorldId } from '@constants/tokens';
import type { ContentStatus, DiscoveryReward } from '@app-types/Discovery';

/**
 * A "Learning Pack" in product terms (docs/product/01-prd.md#9-learning-card-specification) —
 * called `Deck` in code to match docs/implementation/04-content-platform.md's
 * Category → Deck → Discoveries hierarchy.
 */
export interface Deck {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: WorldId;
  displayOrder: number;
  discoveryIds: string[];
  /** Awarded on completion — docs/product/02-user-flows.md Step 7 ("🏆 Ocean Explorer Badge"), never a numeric score. */
  rewardBadge: DiscoveryReward;
  /**
   * The purchasable unit per docs/product/03-monetisation-strategy.md — free
   * starter packs vs paid explorer packs. No real entitlement/purchase
   * system exists yet (docs/implementation/09-purchases.md is a later
   * phase), so for now `!isFree` simply means "locked, routes to the Parent
   * unlock flow" — swap for a real `PurchaseRepository.isEntitled()` check
   * once that lands.
   */
  isFree: boolean;
  version: string;
  status: ContentStatus;
}
