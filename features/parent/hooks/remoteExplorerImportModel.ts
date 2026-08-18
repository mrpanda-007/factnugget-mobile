import type { RemoteExplorerImportService } from '../../../application/sync/RemoteExplorerImportService';
import type { RemoteExplorerSummary } from '@app-types/domain/cloud';
import type { ExplorerId } from '@app-types/domain/ids';

export type RemoteExplorerImportUIStatus =
  | 'idle'
  | 'loadingRemoteExplorers'
  | 'remoteExplorersAvailable'
  | 'noRemoteExplorers'
  | 'importingExplorer'
  | 'importComplete'
  | 'importError';
export interface RemoteExplorerImportUIState {
  status: RemoteExplorerImportUIStatus;
  explorers: RemoteExplorerSummary[];
  message: string;
  active: boolean;
  importedExplorerId: ExplorerId | null;
}
const initial: RemoteExplorerImportUIState = {
  status: 'idle',
  explorers: [],
  message: '',
  active: false,
  importedExplorerId: null,
};

/** Parent-only remote recovery state; Firebase and raw DTOs remain below this model. */
export class RemoteExplorerImportViewModel {
  private state = initial;
  private listeners = new Set<(value: RemoteExplorerImportUIState) => void>();
  private inFlight: Promise<RemoteExplorerImportUIState> | null = null;
  constructor(
    private readonly service: Pick<
      RemoteExplorerImportService,
      'listAvailable' | 'importExplorer' | 'makeImportedExplorerActive'
    >,
  ) {}
  subscribe(listener: (value: RemoteExplorerImportUIState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  load() {
    return this.run(async () => {
      this.publish({
        ...this.state,
        status: 'loadingRemoteExplorers',
        message: 'Looking for Explorers on this parent account…',
        active: true,
      });
      const result = await this.service.listAvailable();
      if (!Array.isArray(result))
        return this.publish({
          ...initial,
          status: 'importError',
          message: 'Explorers could not be loaded right now.',
        });
      return this.publish({
        status: result.length ? 'remoteExplorersAvailable' : 'noRemoteExplorers',
        explorers: result,
        message: result.length
          ? 'Add an Explorer from your parent account to this device.'
          : 'There are no other Explorers available to add yet.',
        active: false,
        importedExplorerId: null,
      });
    });
  }
  importExplorer(explorerId: ExplorerId) {
    return this.run(async () => {
      this.publish({
        ...this.state,
        status: 'importingExplorer',
        message: 'Adding Explorer to this device…',
        active: true,
      });
      const result = await this.service.importExplorer(explorerId);
      return result.state === 'success'
        ? this.publish({
            ...this.state,
            status: 'importComplete',
            message: 'Explorer added to this device.',
            active: false,
            importedExplorerId: explorerId,
          })
        : this.publish({
            ...this.state,
            status: 'importError',
            message: 'Explorer could not be added. No local changes were made.',
            active: false,
          });
    });
  }
  makeActive() {
    return this.run(async () => {
      if (!this.state.importedExplorerId) return this.state;
      const result = await this.service.makeImportedExplorerActive(this.state.importedExplorerId);
      return result.state === 'success'
        ? this.publish({ ...this.state, message: 'Explorer added and selected on this device.' })
        : this.publish({
            ...this.state,
            status: 'importError',
            message: 'Explorer was added, but could not be selected.',
          });
    });
  }
  private run(work: () => Promise<RemoteExplorerImportUIState>) {
    if (!this.inFlight)
      this.inFlight = work().finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }
  private publish(next: RemoteExplorerImportUIState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
    return next;
  }
}
