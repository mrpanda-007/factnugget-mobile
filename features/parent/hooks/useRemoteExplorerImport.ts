import { useEffect, useRef, useState } from 'react';

import { getRemoteExplorerImportService } from '../../../application/sync/remoteExplorerImportRuntime';
import {
  RemoteExplorerImportViewModel,
  type RemoteExplorerImportUIState,
} from './remoteExplorerImportModel';

const initial: RemoteExplorerImportUIState = {
  status: 'idle',
  explorers: [],
  message: '',
  active: false,
  importedExplorerId: null,
};
export function useRemoteExplorerImport(service = getRemoteExplorerImportService()) {
  const [state, setState] = useState(initial);
  const model = useRef<RemoteExplorerImportViewModel | null>(null);
  useEffect(() => {
    const next = new RemoteExplorerImportViewModel(service);
    model.current = next;
    const unsubscribe = next.subscribe(setState);
    return () => {
      unsubscribe();
      if (model.current === next) model.current = null;
    };
  }, [service]);
  return {
    ...state,
    load: () => model.current?.load() ?? Promise.resolve(initial),
    importExplorer: (id: Parameters<RemoteExplorerImportViewModel['importExplorer']>[0]) =>
      model.current?.importExplorer(id) ?? Promise.resolve(initial),
    makeActive: () => model.current?.makeActive() ?? Promise.resolve(initial),
  };
}
