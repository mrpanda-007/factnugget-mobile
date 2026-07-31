/**
 * The child's cosmetic explorer identity (docs/product/02-user-flows.md Step 2
 * "Explorer Identity"). Deliberately not an account or profile: no name, no
 * age, nothing collected — a local, one-time, purely cosmetic choice, per
 * docs/implementation/13-apple-kids-compliance.md's data-minimization stance.
 */
export type ExplorerIdentityId = 'animal' | 'space' | 'ocean' | 'world';

export interface ExplorerIdentityOption {
  id: ExplorerIdentityId;
  label: string;
  emoji: string;
  description: string;
}
