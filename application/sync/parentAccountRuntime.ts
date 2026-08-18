import { FirebaseParentAuthRepository } from '@repositories/adapters/FirebaseParentAuthRepository';
import { UnavailableParentAuthRepository } from '@repositories/adapters/UnavailableParentAuthRepository';
import type { ParentAuthRepositoryContract } from '@repositories/contracts/ParentAuthRepositoryContract';

import { getFirebaseAuth } from '../../infrastructure/firebase/firebaseClient';

import { ParentAccountService } from './ParentAccountService';

let service: ParentAccountService | null = null;

export function createParentAccountService(
  repository: ParentAuthRepositoryContract,
): ParentAccountService {
  return new ParentAccountService(repository);
}

/** Runtime composition chooses real Auth only when all Firebase configuration is present. */
export function getParentAccountService(): ParentAccountService {
  if (!service) {
    const auth = getFirebaseAuth();
    service = new ParentAccountService(
      auth ? new FirebaseParentAuthRepository(auth) : new UnavailableParentAuthRepository(),
    );
  }
  return service;
}
