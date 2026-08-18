import { useEffect, useRef, useState } from 'react';

import { getCommerceDependencies } from '../../../application/commerce/commerceRuntime';
import type { LearningPack } from '@app-types/domain/content';
import {
  PackPurchaseViewModel,
  type PackPurchaseDependencies,
  type PackPurchaseUIState,
} from './packPurchaseModel';

const emptyState: PackPurchaseUIState = {
  status: 'checking-access',
  product: null,
  message: null,
  retryable: false,
  justPurchased: false,
};

/** React binding for the parent-only Pack purchase state machine. */
export function usePackPurchase(
  pack: LearningPack | null,
  dependencies: PackPurchaseDependencies = getCommerceDependencies(),
) {
  const [state, setState] = useState<PackPurchaseUIState>(emptyState);
  const model = useRef<PackPurchaseViewModel | null>(null);

  useEffect(() => {
    if (!pack) {
      return;
    }
    const nextModel = new PackPurchaseViewModel(pack, dependencies);
    model.current = nextModel;
    const unsubscribe = nextModel.subscribe(setState);
    void nextModel.initialize();
    return () => {
      unsubscribe();
      nextModel.dispose();
      if (model.current === nextModel) model.current = null;
    };
  }, [dependencies, pack]);

  return {
    ...(pack ? state : emptyState),
    purchase: () => pack && model.current?.purchase(),
    retry: () => pack && model.current?.retry(),
  };
}
