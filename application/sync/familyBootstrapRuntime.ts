import { FirebaseFamilyBootstrapRepository } from '@repositories/adapters/FirebaseFamilyBootstrapRepository';
import type { FamilyBootstrapRepositoryContract } from '@repositories/contracts/FamilyBootstrapRepositoryContract';

import { getFirebaseFunctions } from '../../infrastructure/firebase/firebaseClient';

let repository: FamilyBootstrapRepositoryContract | null = null;

class UnavailableFamilyBootstrapRepository implements FamilyBootstrapRepositoryContract {
  async getMyFamilyStatus() {
    return { state: 'failure' as const, error: 'serviceUnavailable' as const };
  }
  async createMyFamily() {
    return { state: 'failure' as const, error: 'serviceUnavailable' as const };
  }
}

export function getFamilyBootstrapRepository(): FamilyBootstrapRepositoryContract {
  if (!repository) {
    const functions = getFirebaseFunctions();
    repository = functions
      ? new FirebaseFamilyBootstrapRepository(functions)
      : new UnavailableFamilyBootstrapRepository();
  }
  return repository;
}
