import type { ContentRepositoryContract } from '@repositories/contracts/ContentRepositoryContract';
import { LegacyContentRepositoryAdapter } from '@repositories/adapters/LegacyContentRepositoryAdapter';

/**
 * The offline/emergency fallback tier (Phase 11C.2 §39). This is the same
 * bundled content the app has always shipped — real, fact-checked copy, not
 * placeholder text — reclassified rather than rewritten: it is no longer the
 * canonical editorial source, only what a fresh install shows before its
 * first successful Sanity fetch, and what any install falls back to if the
 * cache is empty, corrupt, or on an unrecognized schema version.
 */
let repository: ContentRepositoryContract | null = null;

export function getBundledStarterContentRepository(): ContentRepositoryContract {
  if (!repository) repository = new LegacyContentRepositoryAdapter();
  return repository;
}
