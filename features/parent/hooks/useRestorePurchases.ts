import { useEffect, useRef, useState } from 'react';

import { getCommerceDependencies } from '../../../application/commerce/commerceRuntime';
import {
  RestorePurchasesViewModel,
  type RestorePurchasesDependencies,
  type RestorePurchasesUIState,
} from './restorePurchasesModel';

const initialState: RestorePurchasesUIState = { status: 'idle', message: null, retryable: false };

/** React binding for the parent-only restore state machine. */
export function useRestorePurchases(
  dependencies: RestorePurchasesDependencies = getCommerceDependencies(),
) {
  const [state, setState] = useState<RestorePurchasesUIState>(initialState);
  const model = useRef<RestorePurchasesViewModel | null>(null);

  useEffect(() => {
    const nextModel = new RestorePurchasesViewModel(dependencies);
    model.current = nextModel;
    const unsubscribe = nextModel.subscribe(setState);
    return () => {
      unsubscribe();
      nextModel.dispose();
      if (model.current === nextModel) model.current = null;
    };
  }, [dependencies]);

  return {
    ...state,
    restore: () => model.current?.restore() ?? Promise.resolve(initialState),
  };
}
