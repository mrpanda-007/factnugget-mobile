import {
  parseCommerceKey,
  parseLearningPackId,
  type CommerceKey,
  type LearningPackId,
} from '@app-types/domain/ids';

/**
 * Phase 8B catalogue: stable capability keys only. Platform product IDs belong
 * to Phase 8D and are intentionally absent from this repository today.
 */
const commerceKeysByLearningPackId: Readonly<Record<string, CommerceKey>> = {
  'space-adventures': parseCommerceKey('space-adventures-one-time'),
};

export function getCommerceKeyForLearningPack(
  learningPackId: LearningPackId,
): CommerceKey | undefined {
  return commerceKeysByLearningPackId[learningPackId];
}

export function getLearningPackIdForCommerceKey(
  commerceKey: CommerceKey | string,
): LearningPackId | undefined {
  const entry = Object.entries(commerceKeysByLearningPackId).find(
    ([, candidate]) => candidate === commerceKey,
  );
  return entry ? parseLearningPackId(entry[0]) : undefined;
}
