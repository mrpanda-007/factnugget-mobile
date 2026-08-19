import { useEffect, useRef, useState } from 'react';

import { getBackupSetupService } from '../../../application/sync/backupSetupRuntime';
import { getFamilyBootstrapRepository } from '../../../application/sync/familyBootstrapRuntime';
import { getParentAccountService } from '../../../application/sync/parentAccountRuntime';

import {
  BackupAndSyncViewModel,
  type BackupAndSyncDependencies,
  type BackupAndSyncState,
} from './backupAndSyncModel';

const initial: BackupAndSyncState = {
  status: 'checking',
  message: 'Checking account…',
  operationActive: false,
};

function runtimeDependencies(): BackupAndSyncDependencies {
  return {
    account: getParentAccountService(),
    bootstrap: getFamilyBootstrapRepository(),
    setup: getBackupSetupService(),
  };
}

/** React binding for the parent-only backup state machine. */
export function useBackupAndSync(dependencies?: BackupAndSyncDependencies) {
  const [state, setState] = useState<BackupAndSyncState>(initial);
  const model = useRef<BackupAndSyncViewModel | null>(null);
  // Runtime composition must stay referentially stable. Recreating this object on every render
  // retriggers the effect after each published state and leaves the UI stuck on "Checking…".
  // A lazy useState initializer (not a ref write) runs this exactly once, on mount, and never
  // touches .current during render — react-hooks/refs forbids the latter.
  const [fallbackDependencies] = useState<BackupAndSyncDependencies | null>(() =>
    dependencies ? null : runtimeDependencies(),
  );
  const resolvedDependencies = dependencies ?? fallbackDependencies!;

  useEffect(() => {
    const next = new BackupAndSyncViewModel(resolvedDependencies);
    model.current = next;
    const unsubscribe = next.subscribe(setState);
    void next.refresh();
    return () => {
      unsubscribe();
      next.dispose();
      if (model.current === next) model.current = null;
    };
  }, [resolvedDependencies]);

  return {
    ...state,
    createAccount: (email: string, password: string) =>
      model.current?.createAccount(email, password) ?? Promise.resolve(initial),
    signIn: (email: string, password: string) =>
      model.current?.signIn(email, password) ?? Promise.resolve(initial),
    requestPasswordReset: (email: string) =>
      model.current?.requestPasswordReset(email) ?? Promise.resolve(initial),
    setUpBackup: () => model.current?.setUpBackup() ?? Promise.resolve(initial),
    addThisDevice: () => model.current?.addThisDevice() ?? Promise.resolve(initial),
    keepLocal: () => model.current?.keepLocal() ?? initial,
    syncNow: () => model.current?.syncNow() ?? Promise.resolve(initial),
    signOut: () => model.current?.signOut() ?? Promise.resolve(initial),
    refresh: () => model.current?.refresh() ?? Promise.resolve(initial),
  };
}
