import { describe, expect, it } from 'vitest';
import { LegacyContentRepositoryAdapter } from '../repositories/adapters/LegacyContentRepositoryAdapter';
import { parseLearningPackId, parseWorldId } from '../types/domain/ids';

describe('legacy content compatibility adapter', () => {
  const repository = new LegacyContentRepositoryAdapter();

  it('preserves the current Ocean Pack order exactly', async () => {
    const packDiscoveries = await repository.listPackDiscoveries(
      parseLearningPackId('ocean-secrets'),
    );
    expect(packDiscoveries.map(({ discovery }) => discovery.id)).toEqual([
      'octopus',
      'blue-whale',
      'shark',
      'dolphin',
    ]);
    expect(packDiscoveries.map(({ membership }) => membership.position)).toEqual([1, 2, 3, 4]);
  });

  it('maps World, Pack, and Discovery separately without canonical stickers', async () => {
    const world = await repository.getWorld(parseWorldId('ocean'));
    const packs = await repository.listLearningPacksForWorld(parseWorldId('ocean'));
    const packDiscoveries = await repository.listPackDiscoveries(
      parseLearningPackId('ocean-secrets'),
    );

    expect(world?.badge.title).toBe('Ocean Explorer Badge');
    expect(packs[0]).toMatchObject({ accessType: 'free', completionRole: 'required' });
    expect(packDiscoveries[0].discovery).not.toHaveProperty('deck');
    expect(packDiscoveries[0].discovery).not.toHaveProperty('category');
    expect(packDiscoveries[0].discovery).not.toHaveProperty('displayOrder');
    expect(packDiscoveries[0].discovery).not.toHaveProperty('stickerReward');
  });

  it('maps the approved Space Pack to an engineering commerce key only', async () => {
    const pack = await repository.getLearningPack(parseLearningPackId('space-adventures'));
    expect(pack).toMatchObject({
      accessType: 'paid',
      commerceKey: 'space-adventures-one-time',
    });
    expect(pack).not.toHaveProperty('platformProductId');
  });
});
