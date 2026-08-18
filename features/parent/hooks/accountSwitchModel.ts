import type { AccountSwitchService } from '../../../application/sync/AccountSwitchService';
import type { FamilyId } from '@app-types/domain/ids';

export type AccountSwitchUIStatus =
  | 'idle'
  | 'switchConfirm'
  | 'switchPendingOldChanges'
  | 'switchResolvingFamily'
  | 'switchChooseLocalHandling'
  | 'switching'
  | 'switchComplete'
  | 'error';

export interface AccountSwitchUIState {
  status: AccountSwitchUIStatus;
  message: string;
  pendingOldChanges: number;
  targetFamilyId: FamilyId | null;
  active: boolean;
}

const initial: AccountSwitchUIState = {
  status: 'idle',
  message: '',
  pendingOldChanges: 0,
  targetFamilyId: null,
  active: false,
};

/** Parent-only explicit account-switch state machine. It never makes a switch on sign-in alone. */
export class AccountSwitchViewModel {
  private state = initial;
  private listeners = new Set<(value: AccountSwitchUIState) => void>();
  private inFlight: Promise<AccountSwitchUIState> | null = null;

  constructor(
    private readonly service: Pick<
      AccountSwitchService,
      'prepare' | 'finalize' | 'createTargetFamily'
    >,
  ) {}
  get snapshot() {
    return this.state;
  }
  subscribe(listener: (value: AccountSwitchUIState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  confirmIntent() {
    return this.publish({
      ...this.state,
      status: 'switchConfirm',
      message: 'Switching accounts will not move unsynced changes from the previous account.',
    });
  }
  prepare() {
    return this.run(() => this.prepareInternal());
  }
  createTargetFamily() {
    return this.run(() => this.createTargetInternal());
  }
  finalize() {
    return this.run(() => this.finalizeInternal());
  }

  private async prepareInternal(): Promise<AccountSwitchUIState> {
    this.publish({
      ...this.state,
      status: 'switchResolvingFamily',
      message: 'Checking the new parent account…',
      active: true,
    });
    const result = await this.service.prepare();
    if (result.state === 'sameAccount')
      return this.publish({
        ...initial,
        status: 'switchComplete',
        message: 'This device is already linked to this parent account.',
      });
    if (result.state === 'targetNeedsFamily')
      return this.publish({
        status: 'switchChooseLocalHandling',
        message:
          'This parent account is ready to set up Backup & Sync. Creating it will not upload this device’s Explorers automatically.',
        pendingOldChanges: result.pendingOldChanges,
        targetFamilyId: null,
        active: false,
      });
    if (result.state === 'ready')
      return this.publish({
        status:
          result.pendingOldChanges > 0 ? 'switchPendingOldChanges' : 'switchChooseLocalHandling',
        message:
          result.pendingOldChanges > 0
            ? 'Some learning changes have not been backed up to the currently linked account. Switching will leave them safely with that account.'
            : 'Choose how to connect this device to the new parent account.',
        pendingOldChanges: result.pendingOldChanges,
        targetFamilyId: result.targetFamilyId,
        active: false,
      });
    return this.publish({
      ...initial,
      status: 'error',
      message: 'The account switch could not be prepared. Your current device link is unchanged.',
    });
  }

  private async createTargetInternal(): Promise<AccountSwitchUIState> {
    this.publish({
      ...this.state,
      status: 'switchResolvingFamily',
      message: 'Creating a secure Family for the new parent account…',
      active: true,
    });
    const result = await this.service.createTargetFamily();
    if (result.state === 'ready')
      return this.publish({
        status: 'switchChooseLocalHandling',
        message:
          'Choose how to connect this device. Its existing Explorers will not upload unless you choose to add them.',
        pendingOldChanges: result.pendingOldChanges,
        targetFamilyId: result.targetFamilyId,
        active: false,
      });
    return this.publish({
      ...initial,
      status: 'error',
      message:
        'Backup setup for the new account could not be completed. Your current device link is unchanged.',
    });
  }

  private async finalizeInternal(): Promise<AccountSwitchUIState> {
    if (!this.state.targetFamilyId)
      return this.publish({
        ...this.state,
        status: 'error',
        message: 'Choose a parent account Family before switching.',
      });
    this.publish({
      ...this.state,
      status: 'switching',
      message: 'Connecting this device to the new parent account…',
      active: true,
    });
    const result = await this.service.finalize(this.state.targetFamilyId);
    if (result.state === 'success' || result.state === 'sameAccount')
      return this.publish({
        ...this.state,
        status: 'switchComplete',
        message: 'This device is now connected to the selected parent account.',
        active: false,
      });
    return this.publish({
      ...this.state,
      status: 'error',
      message: 'The account switch could not be completed. Your previous device link is unchanged.',
      active: false,
    });
  }

  private run(work: () => Promise<AccountSwitchUIState>) {
    if (!this.inFlight)
      this.inFlight = work().finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }
  private publish(next: AccountSwitchUIState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
    return next;
  }
}
