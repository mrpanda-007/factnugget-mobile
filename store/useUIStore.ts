import { create } from 'zustand';

/**
 * Example Zustand store proving the client-state layer is wired correctly
 * (docs/implementation/07-state-management.md). Holds app-shell UI state
 * only — no product/business logic. Real stores (theme, child selection,
 * active deck, etc.) are added per 07-state-management.md as those
 * features are built.
 */
interface UIState {
  isAppShellReady: boolean;
  setAppShellReady: (ready: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAppShellReady: false,
  setAppShellReady: (ready) => set({ isAppShellReady: ready }),
}));
