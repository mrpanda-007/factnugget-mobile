import type { FamilyBootstrapCreateResult, FamilyBootstrapStatus } from '@app-types/domain/cloud';

/** Privileged Family bootstrap boundary. Implementations never expose callable SDK types. */
export interface FamilyBootstrapRepositoryContract {
  getMyFamilyStatus(): Promise<FamilyBootstrapStatus>;
  createMyFamily(): Promise<FamilyBootstrapCreateResult>;
}
