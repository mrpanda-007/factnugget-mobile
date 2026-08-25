import { useCallback, useState } from 'react';

import { liveContentRepository } from '../../../application/content/contentRuntime';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { Discovery, LearningPack, World } from '@app-types/domain/content';
import type { DeckProgress } from '@app-types/Progress';
import type { EarnedBadge } from '@app-types/domain/progress';
import { getLearningPackAccessService } from '../../../application/commerce/commerceRuntime';
import { parseDiscoveryId, parseWorldId } from '@app-types/domain/ids';

interface WorldHomeState {
  isLoading: boolean;
  loadFailed: boolean;
  world: World | null;
  pack: LearningPack | null;
  deckProgress: DeckProgress | null;
  worldBadge: EarnedBadge | null;
  discoveries: Discovery[];
  collectionPreview: Discovery[];
  nextDiscovery: Discovery | null;
  accessState: 'loading' | 'allowed' | 'locked' | 'unavailable';
}

const initialState: WorldHomeState = {
  isLoading: true,
  loadFailed: false,
  world: null,
  pack: null,
  deckProgress: null,
  worldBadge: null,
  discoveries: [],
  collectionPreview: [],
  nextDiscovery: null,
  accessState: 'loading',
};

/**
 * Feature-local — World Home's specific mix of world/pack/progress/collection-preview data.
 *
 * Does not self-load: the caller drives it with `refresh()` inside
 * `useFocusEffect`, which already covers first mount as well as every return
 * to the screen. An additional `useEffect(() => { load() })` here would both
 * double-fetch on mount and trip `react-hooks/set-state-in-effect`.
 */
export function useWorldHome(worldIdParam: string) {
  const [state, setState] = useState<WorldHomeState>(initialState);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, loadFailed: false }));
    try {
      const worldId = parseWorldId(worldIdParam);
      const [world, packs] = await Promise.all([
        liveContentRepository.getWorld(worldId),
        liveContentRepository.listLearningPacksForWorld(worldId),
      ]);
      const pack = packs[0] ?? null;
      if (!pack) {
        setState({ ...initialState, isLoading: false, world, accessState: 'unavailable' });
        return;
      }
      const access = await getLearningPackAccessService().getLearningPackAccess(pack.id);
      if (access.state !== 'allowed') {
        setState({ ...initialState, isLoading: false, world, pack, accessState: 'locked' });
        return;
      }
      const collected = await ProgressRepository.getCollection();
      const [deckProgress, packDiscoveries, worldBadge] = await Promise.all([
        ProgressRepository.getDeckProgress(pack.id),
        liveContentRepository.listPackDiscoveries(pack.id),
        ProgressRepository.getWorldBadge(worldId),
      ]);
      const discoveries = packDiscoveries.map(({ discovery }) => discovery);

      let collectionPreview: Discovery[] = [];
      if (collected.length > 0) {
        const discoveriesById = new Map(discoveries.map((discovery) => [discovery.id, discovery]));
        const relevantIds = collected
          .map((item) => parseDiscoveryId(item.discoveryId))
          .filter((id) => discoveriesById.has(id))
          .slice(0, 4);
        collectionPreview = relevantIds
          .map((id) => discoveriesById.get(id))
          .filter((discovery): discovery is Discovery => discovery !== undefined);
      }

      const completedIds = new Set(deckProgress?.completedDiscoveryIds ?? []);
      const nextDiscovery =
        discoveries.find((discovery) => !completedIds.has(discovery.id)) ?? null;

      setState({
        isLoading: false,
        loadFailed: false,
        world,
        pack,
        deckProgress,
        worldBadge,
        discoveries,
        collectionPreview,
        nextDiscovery,
        accessState: 'allowed',
      });
    } catch {
      setState({ ...initialState, isLoading: false, loadFailed: true });
    }
  }, [worldIdParam]);

  return { ...state, refresh: load };
}
