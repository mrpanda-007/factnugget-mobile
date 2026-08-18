import { useEffect, useRef, useState } from 'react';

import { getAccountSwitchService } from '../../../application/sync/accountSwitchRuntime';
import { AccountSwitchViewModel, type AccountSwitchUIState } from './accountSwitchModel';

const initial: AccountSwitchUIState = {
  status: 'idle',
  message: '',
  pendingOldChanges: 0,
  targetFamilyId: null,
  active: false,
};

export function useAccountSwitch(service = getAccountSwitchService()) {
  const [state, setState] = useState(initial);
  const model = useRef<AccountSwitchViewModel | null>(null);
  useEffect(() => {
    const next = new AccountSwitchViewModel(service);
    model.current = next;
    const unsubscribe = next.subscribe(setState);
    return () => {
      unsubscribe();
      if (model.current === next) model.current = null;
    };
  }, [service]);
  return {
    ...state,
    confirmIntent: () => model.current?.confirmIntent(),
    prepare: () => model.current?.prepare() ?? Promise.resolve(initial),
    createTargetFamily: () => model.current?.createTargetFamily() ?? Promise.resolve(initial),
    finalize: () => model.current?.finalize() ?? Promise.resolve(initial),
  };
}
