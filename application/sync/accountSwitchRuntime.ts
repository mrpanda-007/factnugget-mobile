import { AccountSwitchService } from './AccountSwitchService';
import { getFamilyBootstrapRepository } from './familyBootstrapRuntime';
import { getCloudAccountBindingRepository, getSyncOutboxRepository } from './localSyncQueueRuntime';
import { getParentAccountService } from './parentAccountRuntime';

let service: AccountSwitchService | null = null;

export function getAccountSwitchService(): AccountSwitchService {
  if (!service) {
    service = new AccountSwitchService({
      bindings: getCloudAccountBindingRepository(),
      outbox: getSyncOutboxRepository(),
      bootstrap: getFamilyBootstrapRepository(),
      session: getParentAccountService(),
    });
  }
  return service;
}
