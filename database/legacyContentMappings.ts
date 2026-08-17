import { oceanCategory, oceanSecretsDeck } from '@services/mock/oceanWorldContent';
import { spaceAdventuresDeck, spaceCategory } from '@services/mock/spaceWorldContent';

interface LegacyWorldMapping {
  worldId: string;
  isOnlyRequiredPack: boolean;
}

const mappings = new Map<string, LegacyWorldMapping>([
  [
    oceanSecretsDeck.id,
    { worldId: oceanCategory.id, isOnlyRequiredPack: oceanCategory.deckIds.length === 1 },
  ],
  [
    spaceAdventuresDeck.id,
    { worldId: spaceCategory.id, isOnlyRequiredPack: spaceCategory.deckIds.length === 1 },
  ],
]);

/** Unknown legacy Packs retain Pack progress, but never receive an inferred Badge. */
export function getLegacyWorldForPack(learningPackId: string): LegacyWorldMapping | null {
  return mappings.get(learningPackId) ?? null;
}
