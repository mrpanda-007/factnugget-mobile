import { create } from 'zustand';

import * as ProgressRepository from '@repositories/ProgressRepository';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';

/**
 * Client state for the explorer session — docs/implementation/07-state-management.md.
 *
 * `identity` and `soundEnabled` must survive app restart, so they're persisted
 * in SQLite (via ProgressRepository) and mirrored here for reactive reads:
 * `hydrate()` loads them once at boot, and every setter writes through the
 * repository first. `activeDeckId` / `currentDiscoveryIndex` are genuinely
 * ephemeral session state ("Active deck", "Current discovery" —
 * 07-state-management.md's Zustand list) and are never persisted directly;
 * "which deck to resume" is derived from progress data instead
 * (docs/design/01-screen-map.md), not stored here.
 */
interface ExplorerState {
  isHydrated: boolean;
  identity: ExplorerIdentityId | null;
  soundEnabled: boolean;
  activeDeckId: string | null;
  currentDiscoveryIndex: number;

  hydrate: () => Promise<void>;
  chooseIdentity: (identityId: ExplorerIdentityId) => Promise<void>;
  toggleSound: () => Promise<void>;
  setActiveDiscovery: (deckId: string, index: number) => void;
  clearActiveDiscovery: () => void;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  isHydrated: false,
  identity: null,
  soundEnabled: false,
  activeDeckId: null,
  currentDiscoveryIndex: 0,

  hydrate: async () => {
    const [identity, soundEnabled] = await Promise.all([
      ProgressRepository.getIdentity(),
      ProgressRepository.getSoundEnabled(),
    ]);
    set({ identity, soundEnabled, isHydrated: true });
  },

  chooseIdentity: async (identityId) => {
    await ProgressRepository.setIdentity(identityId);
    set({ identity: identityId });
  },

  toggleSound: async () => {
    const next = !get().soundEnabled;
    await ProgressRepository.setSoundEnabled(next);
    set({ soundEnabled: next });
  },

  setActiveDiscovery: (deckId, index) => {
    set({ activeDeckId: deckId, currentDiscoveryIndex: index });
  },

  clearActiveDiscovery: () => {
    set({ activeDeckId: null, currentDiscoveryIndex: 0 });
  },
}));
