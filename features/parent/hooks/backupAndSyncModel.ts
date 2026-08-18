import type {
  CloudSyncError,
  FamilyBootstrapError,
  ParentAuthFailureCode,
} from '@app-types/domain/cloud';
import type { ParentAccountServiceContract } from '../../../application/sync/ParentAccountServiceContract';
import type { BackupSetupService } from '../../../application/sync/BackupSetupService';
import type { FamilyBootstrapRepositoryContract } from '@repositories/contracts/FamilyBootstrapRepositoryContract';

export type BackupAndSyncStatus =
  | 'checking'
  | 'localOnlySignedOut'
  | 'signedOutBound'
  | 'authenticating'
  | 'authenticatedUnbound'
  | 'checkingFamily'
  | 'familySetupAvailable'
  | 'existingFamilyChoiceRequired'
  | 'binding'
  | 'seeding'
  | 'syncing'
  | 'connected'
  | 'pendingChanges'
  | 'offline'
  | 'accountMismatch'
  | 'familyMismatch'
  | 'error';

export interface BackupAndSyncState {
  status: BackupAndSyncStatus;
  message: string;
  operationActive: boolean;
}

export interface BackupAndSyncDependencies {
  account: ParentAccountServiceContract;
  bootstrap: FamilyBootstrapRepositoryContract;
  setup: Pick<BackupSetupService, 'bindAndSeed' | 'syncSeeded' | 'listLocalExplorerIds'>;
}

const initial: BackupAndSyncState = {
  status: 'checking',
  message: 'Checking account…',
  operationActive: false,
};

function authMessage(code: ParentAuthFailureCode): string {
  switch (code) {
    case 'invalidCredentials':
      return 'Check the email and password, then try again.';
    case 'emailAlreadyInUse':
      return 'An account already uses this email. Try signing in instead.';
    case 'weakPassword':
      return 'Choose a stronger password and try again.';
    case 'networkUnavailable':
      return 'You’re offline. Please try again when you’re connected.';
    case 'rateLimited':
      return 'Please wait a moment before trying again.';
    case 'unavailable':
      return 'Parent accounts are not configured in this build.';
    default:
      return 'That account action could not be completed right now.';
  }
}

function bootstrapMessage(code: FamilyBootstrapError): string {
  switch (code) {
    case 'authRequired':
      return 'Please sign in again to set up Backup & Sync.';
    case 'networkUnavailable':
      return 'You’re offline. Learning continues on this device and setup can resume later.';
    case 'serviceUnavailable':
      return 'Backup setup is temporarily unavailable. Please try again later.';
    case 'rateLimited':
      return 'Please wait a moment before trying again.';
    case 'integrityFailure':
      return 'This account needs attention before Backup & Sync can continue.';
    default:
      return 'Backup setup could not be completed right now.';
  }
}

function syncMessage(error: CloudSyncError): string {
  if (error === 'offline' || error === 'unavailable') {
    return 'You’re offline. Learning continues on this device and will sync later.';
  }
  if (error === 'bindingMismatch') return 'This device is linked to a different parent account.';
  return 'Backup is set up. Some changes are waiting to sync.';
}

/** Finite parent-only state machine. It never changes child startup or local child actions. */
export class BackupAndSyncViewModel {
  private state = initial;
  private listeners = new Set<(state: BackupAndSyncState) => void>();
  private inFlight: Promise<BackupAndSyncState> | null = null;
  private disposed = false;

  constructor(private readonly dependencies: BackupAndSyncDependencies) {}

  get snapshot(): BackupAndSyncState {
    return this.state;
  }

  subscribe(listener: (state: BackupAndSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  refresh(): Promise<BackupAndSyncState> {
    return this.runExclusive(() => this.refreshInternal());
  }

  async createAccount(email: string, password: string): Promise<BackupAndSyncState> {
    return this.runExclusive(async () => {
      this.publish('authenticating', 'Creating parent account…', true);
      const result = await this.dependencies.account.createAccount(email, password);
      if (result.state === 'failure') return this.publish('error', authMessage(result.code), false);
      return this.createFamilyAndBind();
    });
  }

  async signIn(email: string, password: string): Promise<BackupAndSyncState> {
    return this.runExclusive(async () => {
      this.publish('authenticating', 'Signing in…', true);
      const result = await this.dependencies.account.signIn(email, password);
      if (result.state === 'failure') return this.publish('error', authMessage(result.code), false);
      return this.refreshInternal();
    });
  }

  async requestPasswordReset(email: string): Promise<BackupAndSyncState> {
    return this.runExclusive(async () => {
      this.publish('authenticating', 'Sending reset email…', true);
      const result = await this.dependencies.account.requestPasswordReset(email);
      return result.state === 'success'
        ? this.publish(
            'localOnlySignedOut',
            'If that email has an account, a reset link is on its way.',
            false,
          )
        : this.publish('error', authMessage(result.code), false);
    });
  }

  setUpBackup(): Promise<BackupAndSyncState> {
    return this.runExclusive(() => this.createFamilyAndBind());
  }

  addThisDevice(): Promise<BackupAndSyncState> {
    return this.runExclusive(() => this.bindExistingFamily());
  }

  keepLocal(): BackupAndSyncState {
    return this.publish(
      'authenticatedUnbound',
      'This device will stay local until you choose to set up Backup & Sync.',
      false,
    );
  }

  syncNow(): Promise<BackupAndSyncState> {
    return this.runExclusive(() => this.syncBoundLocalExplorers());
  }

  async signOut(): Promise<BackupAndSyncState> {
    return this.runExclusive(async () => {
      this.publish('authenticating', 'Signing out…', true);
      const result = await this.dependencies.account.signOut();
      if (result.state === 'failure') return this.publish('error', authMessage(result.code), false);
      // The local binding and its durable outbox remain intact by policy.
      return this.refreshInternal();
    });
  }

  private async refreshInternal(): Promise<BackupAndSyncState> {
    this.publish('checking', 'Checking account…', true);
    const [session, binding] = await Promise.all([
      this.dependencies.account.getSession(),
      this.dependencies.account.getBinding(),
    ]);
    if (!session) {
      return binding.state === 'bound'
        ? this.publish(
            'signedOutBound',
            'Backup is paused until the linked parent account signs in again.',
            false,
          )
        : this.publish(
            'localOnlySignedOut',
            'Backup & Sync is optional. You can keep using FactNuggets without an account.',
            false,
          );
    }
    if (binding.state === 'bound' && binding.authUserId !== session.authUserId) {
      return this.publish(
        'accountMismatch',
        'This device is linked to a different parent account.',
        false,
      );
    }

    this.publish('checkingFamily', 'Checking Backup & Sync…', true);
    const remote = await this.dependencies.bootstrap.getMyFamilyStatus();
    if (remote.state === 'failure')
      return this.publish(
        remote.error === 'networkUnavailable' ? 'offline' : 'error',
        bootstrapMessage(remote.error),
        false,
      );
    if (binding.state === 'bound') {
      if (remote.state !== 'exists' || remote.familyId !== binding.familyId) {
        return this.publish(
          'familyMismatch',
          'This account’s Family record does not match this device. Sync is paused.',
          false,
        );
      }
      // A parent opening this surface gets one coalesced, conservative attempt.
      // There is no startup sync, interval, listener, or render-triggered loop.
      return this.syncBoundLocalExplorers();
    }
    if (remote.state === 'exists') {
      return this.publish(
        'existingFamilyChoiceRequired',
        'This parent account already has a Family. Choose what to do with this device’s Explorers.',
        false,
      );
    }
    return this.publish('familySetupAvailable', 'Set up Backup & Sync when you’re ready.', false);
  }

  private async createFamilyAndBind(): Promise<BackupAndSyncState> {
    const session = await this.dependencies.account.getSession();
    if (!session)
      return this.publish('error', 'Please sign in before setting up Backup & Sync.', false);
    this.publish('binding', 'Creating your secure Family…', true);
    const created = await this.dependencies.bootstrap.createMyFamily();
    if (created.state === 'failure')
      return this.publish(
        created.error === 'networkUnavailable' ? 'offline' : 'error',
        bootstrapMessage(created.error),
        false,
      );
    return this.bindAndSync(session.authUserId, created.familyId);
  }

  private async bindExistingFamily(): Promise<BackupAndSyncState> {
    const session = await this.dependencies.account.getSession();
    if (!session) return this.publish('error', 'Please sign in before adding this device.', false);
    const remote = await this.dependencies.bootstrap.getMyFamilyStatus();
    if (remote.state === 'failure')
      return this.publish(
        remote.error === 'networkUnavailable' ? 'offline' : 'error',
        bootstrapMessage(remote.error),
        false,
      );
    if (remote.state !== 'exists')
      return this.publish('familySetupAvailable', 'Set up Backup & Sync when you’re ready.', false);
    return this.bindAndSync(session.authUserId, remote.familyId);
  }

  private async bindAndSync(
    authUserId: Parameters<BackupSetupService['bindAndSeed']>[0],
    familyId: Parameters<BackupSetupService['bindAndSeed']>[1],
  ): Promise<BackupAndSyncState> {
    this.publish('seeding', 'Preparing this device’s learning progress for backup…', true);
    const seeded = await this.dependencies.setup.bindAndSeed(authUserId, familyId);
    if (seeded.state === 'accountSwitchRequired') {
      return this.publish(
        'accountMismatch',
        'This device is linked to a different parent account.',
        false,
      );
    }
    if (seeded.state === 'failure')
      return this.publish(
        'error',
        'Backup setup could not save local sync information. Please try again.',
        false,
      );
    return this.syncExplorerIds(seeded.explorerIds);
  }

  private async syncBoundLocalExplorers(): Promise<BackupAndSyncState> {
    const binding = await this.dependencies.account.getBinding();
    if (binding.state !== 'bound') return this.refreshInternal();
    return this.syncExplorerIds(await this.dependencies.setup.listLocalExplorerIds());
  }

  private async syncExplorerIds(
    explorerIds: Parameters<BackupSetupService['syncSeeded']>[0],
  ): Promise<BackupAndSyncState> {
    this.publish('syncing', 'Syncing learning progress…', true);
    const result = await this.dependencies.setup.syncSeeded(explorerIds);
    if (result.state === 'failure' || result.state === 'partial') {
      const status =
        result.error === 'offline' || result.error === 'unavailable' ? 'offline' : 'pendingChanges';
      return this.publish(status, syncMessage(result.error), false);
    }
    return this.publish(
      result.remainingPending === 0 ? 'connected' : 'pendingChanges',
      result.remainingPending === 0
        ? 'Up to date.'
        : 'Backup is set up. Some changes are waiting to sync.',
      false,
    );
  }

  private runExclusive(work: () => Promise<BackupAndSyncState>): Promise<BackupAndSyncState> {
    if (!this.inFlight) {
      this.inFlight = work().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  private publish(
    status: BackupAndSyncStatus,
    message: string,
    operationActive: boolean,
  ): BackupAndSyncState {
    this.state = { status, message, operationActive };
    if (!this.disposed) this.listeners.forEach((listener) => listener(this.state));
    return this.state;
  }
}
