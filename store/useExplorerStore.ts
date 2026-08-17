import { create } from 'zustand';

import * as ExplorerRepository from '@repositories/ExplorerRepository';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { ExplorerId } from '@app-types/domain/ids';

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
  explorerId: ExplorerId | null;
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
  explorerId: null,
  identity: null,
  soundEnabled: false,
  activeDeckId: null,
  currentDiscoveryIndex: 0,

  hydrate: async () => {
    const { explorer, soundEnabled } = await ExplorerRepository.getActiveExplorerState();
    set({
      explorerId: explorer?.id ?? null,
      identity: explorer?.lookId ?? null,
      soundEnabled,
      isHydrated: true,
    });
  },

  chooseIdentity: async (identityId) => {
    const explorer = await ExplorerRepository.createOrUpdateActiveExplorer(identityId);
    set({ explorerId: explorer.id, identity: explorer.lookId });
  },

  toggleSound: async () => {
    const next = !get().soundEnabled;
    await ExplorerRepository.setSoundEnabled(next);
    set({ soundEnabled: next });
  },

  setActiveDiscovery: (deckId, index) => {
    set({ activeDeckId: deckId, currentDiscoveryIndex: index });
  },

  clearActiveDiscovery: () => {
    set({ activeDeckId: null, currentDiscoveryIndex: 0 });
  },
}));
