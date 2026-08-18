import type { FamilyBootstrapError } from '@app-types/domain/cloud';
import type { FamilyId } from '@app-types/domain/ids';
import type { CloudAccountBindingRepositoryContract } from '@repositories/contracts/CloudAccountBindingRepositoryContract';
import type { FamilyBootstrapRepositoryContract } from '@repositories/contracts/FamilyBootstrapRepositoryContract';
import type { SyncOutboxRepositoryContract } from '@repositories/contracts/SyncOutboxRepositoryContract';

import type { ParentSessionReader } from './CloudSyncService';

export type AccountSwitchResult =
  | { state: 'sameAccount' }
  | { state: 'targetNeedsFamily'; pendingOldChanges: number }
  | { state: 'ready'; targetFamilyId: FamilyId; pendingOldChanges: number }
  | { state: 'success'; familyId: FamilyId }
  | {
      state: 'failure';
      error: 'authRequired' | 'networkUnavailable' | 'familyMismatch' | 'unknownFailure';
    };

function normalize(
  error: FamilyBootstrapError,
): Extract<AccountSwitchResult, { state: 'failure' }>['error'] {
  if (error === 'authRequired') return 'authRequired';
  if (error === 'networkUnavailable' || error === 'serviceUnavailable') return 'networkUnavailable';
  if (error === 'integrityFailure' || error === 'invalidResponse') return 'familyMismatch';
  return 'unknownFailure';
}

/** Explicit switching coordinator. It never detaches first or reassigns any old Family queue row. */
export class AccountSwitchService {
  constructor(
    private readonly dependencies: {
      bindings: CloudAccountBindingRepositoryContract;
      outbox: Pick<SyncOutboxRepositoryContract, 'countPending'>;
      bootstrap: FamilyBootstrapRepositoryContract;
      session: ParentSessionReader;
      now?: () => string;
    },
  ) {}

  async prepare(): Promise<AccountSwitchResult> {
    const [binding, session] = await Promise.all([
      this.dependencies.bindings.getCurrentBinding(),
      this.dependencies.session.getSession(),
    ]);
    if (!session) return { state: 'failure', error: 'authRequired' };
    if (binding.state !== 'bound') return { state: 'failure', error: 'familyMismatch' };
    if (binding.authUserId === session.authUserId) return { state: 'sameAccount' };
    const pendingOldChanges = await this.dependencies.outbox.countPending(binding.familyId);
    const status = await this.dependencies.bootstrap.getMyFamilyStatus();
    if (status.state === 'failure') return { state: 'failure', error: normalize(status.error) };
    if (status.state === 'none') return { state: 'targetNeedsFamily', pendingOldChanges };
    return { state: 'ready', targetFamilyId: status.familyId, pendingOldChanges };
  }

  /** Atomic binding replacement after an explicit parent choice. Historical state is deliberately not seeded. */
  async finalize(targetFamilyId: FamilyId): Promise<AccountSwitchResult> {
    const [binding, session, status] = await Promise.all([
      this.dependencies.bindings.getCurrentBinding(),
      this.dependencies.session.getSession(),
      this.dependencies.bootstrap.getMyFamilyStatus(),
    ]);
    if (!session) return { state: 'failure', error: 'authRequired' };
    if (binding.state !== 'bound') return { state: 'failure', error: 'familyMismatch' };
    if (binding.authUserId === session.authUserId && binding.familyId === targetFamilyId) {
      return { state: 'sameAccount' };
    }
    if (status.state === 'failure') return { state: 'failure', error: normalize(status.error) };
    if (status.state !== 'exists' || status.familyId !== targetFamilyId) {
      return { state: 'failure', error: 'familyMismatch' };
    }
    try {
      await this.dependencies.bindings.replaceBinding({
        authUserId: session.authUserId,
        familyId: targetFamilyId,
        boundAt: this.dependencies.now?.() ?? new Date().toISOString(),
        expectedAuthUserId: binding.authUserId,
        expectedFamilyId: binding.familyId,
      });
      return { state: 'success', familyId: targetFamilyId };
    } catch {
      // The old row remains if the single replacement statement does not commit.
      return { state: 'failure', error: 'unknownFailure' };
    }
  }

  async createTargetFamily(): Promise<AccountSwitchResult> {
    const created = await this.dependencies.bootstrap.createMyFamily();
    if (created.state === 'failure') return { state: 'failure', error: normalize(created.error) };
    const prepared = await this.prepare();
    return prepared.state === 'ready' && prepared.targetFamilyId === created.familyId
      ? prepared
      : { state: 'failure', error: 'familyMismatch' };
  }
}
