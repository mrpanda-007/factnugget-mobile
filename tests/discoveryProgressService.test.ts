import { beforeEach, describe, expect, it } from 'vitest';
import { DiscoveryProgressService } from '../application/DiscoveryProgressService';
import type { LearningPackDiscovery } from '../types/domain/content';
import {
  parseDiscoveryId,
  parseExplorerId,
  parseLearningPackId,
  parseWorldId,
} from '../types/domain/ids';
import {
  InMemoryContentRepository,
  InMemoryProgressRepository,
  type InMemoryContentSeed,
} from './helpers/InMemoryRepositories';
import {
  amazingMammalsPackId,
  blueWhaleId,
  dolphinId,
  makeDiscovery,
  makePack,
  makeWorld,
  membership,
  oceanGiantsPackId,
  oceanWorldId,
  optionalPackId,
  sharkId,
  sharedDiscoverySeed,
} from './helpers/fixtures';

const explorerA = parseExplorerId('00000000-0000-4000-8000-000000000001');
const explorerB = parseExplorerId('00000000-0000-4000-8000-000000000002');
const occurredAt = '2026-08-12T10:00:00.000Z';

function serviceFor(seed: InMemoryContentSeed): {
  content: InMemoryContentRepository;
  progress: InMemoryProgressRepository;
  service: DiscoveryProgressService;
} {
  const content = new InMemoryContentRepository(seed);
  const progress = new InMemoryProgressRepository();
  const service = new DiscoveryProgressService({ content, progress, now: () => occurredAt });
  return { content, progress, service };
}

function oceanOrderSeed(): InMemoryContentSeed {
  const discoveryIds = ['octopus', 'blue-whale', 'shark', 'dolphin'];
  return {
    worlds: [makeWorld()],
    learningPacks: [makePack('ocean-secrets', 1)],
    discoveries: discoveryIds.map(makeDiscovery),
    memberships: discoveryIds.map((id, index) => membership('ocean-secrets', id, index + 1)),
  };
}

describe('Phase 1 discovery loop characterization', () => {
  let content: InMemoryContentRepository;
  let progress: InMemoryProgressRepository;
  let service: DiscoveryProgressService;
  const packId = parseLearningPackId('ocean-secrets');
  const octopusId = parseDiscoveryId('octopus');

  beforeEach(() => {
    ({ content, progress, service } = serviceFor(oceanOrderSeed()));
  });

  it('starts unseen, reveals without collecting, and only collects explicitly', async () => {
    expect(await progress.getDiscoveryProgress(explorerA, octopusId)).toBeNull();

    await service.revealDiscovery({
      explorerId: explorerA,
      learningPackId: packId,
      discoveryId: octopusId,
    });
    expect(await progress.getDiscoveryProgress(explorerA, octopusId)).toMatchObject({
      revealedAt: occurredAt,
      collectedAt: null,
    });
    expect(await progress.getPackDiscoveryProgress(explorerA, packId, octopusId)).toMatchObject({
      completedAt: null,
    });

    const result = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: packId,
      discoveryId: octopusId,
    });
    expect(result.discoveryCollectedNow).toBe(true);
    expect(await progress.getDiscoveryProgress(explorerA, octopusId)).toMatchObject({
      collectedAt: occurredAt,
    });
  });

  it('persists through a new service instance and reads/recalls without mutation', async () => {
    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: packId,
      discoveryId: octopusId,
    });
    const before = await progress.getDiscoveryProgress(explorerA, octopusId);
    const reloaded = new DiscoveryProgressService({ content, progress, now: () => occurredAt });

    await content.getDiscovery(octopusId);
    await reloaded.getNextIncompleteDiscovery(explorerA, packId);

    expect(await progress.getDiscoveryProgress(explorerA, octopusId)).toEqual(before);
  });

  it('resumes at the first incomplete membership in exact Pack order', async () => {
    expect(
      (await content.listPackDiscoveries(packId)).map(({ discovery }) => discovery.id),
    ).toEqual(['octopus', 'blue-whale', 'shark', 'dolphin']);
    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: packId,
      discoveryId: octopusId,
    });
    expect((await service.getNextIncompleteDiscovery(explorerA, packId))?.discovery.id).toBe(
      'blue-whale',
    );
  });
});

describe('shared Discovery and Explorer scoping', () => {
  it('collects Blue Whale globally once but completes each Pack membership deliberately', async () => {
    const { progress, service } = serviceFor(sharedDiscoverySeed());

    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });

    expect(await progress.listCollectedDiscoveryIds(explorerA)).toEqual([blueWhaleId]);
    expect(
      await progress.getPackDiscoveryProgress(explorerA, oceanGiantsPackId, blueWhaleId),
    ).toMatchObject({ completedAt: occurredAt });
    expect(
      await progress.getPackDiscoveryProgress(explorerA, amazingMammalsPackId, blueWhaleId),
    ).toBeNull();
    expect(
      (await service.getNextIncompleteDiscovery(explorerA, amazingMammalsPackId))?.discovery.id,
    ).toBe(blueWhaleId);

    const revisit = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: amazingMammalsPackId,
      discoveryId: blueWhaleId,
    });
    expect(revisit.discoveryCollectedNow).toBe(false);
    expect(revisit.packMembershipCompletedNow).toBe(true);
    expect(await progress.listCollectedDiscoveryIds(explorerA)).toEqual([blueWhaleId]);
  });

  it('isolates all global, Pack, and Badge progress by Explorer', async () => {
    const { progress, service } = serviceFor(sharedDiscoverySeed());
    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });

    expect(await progress.listCollectedDiscoveryIds(explorerB)).toEqual([]);
    expect(
      await progress.getPackDiscoveryProgress(explorerB, oceanGiantsPackId, blueWhaleId),
    ).toBeNull();
    expect(await progress.listEarnedBadges(explorerB)).toEqual([]);
  });
});

describe('Pack completion and World Badge semantics', () => {
  it('requires explicit collection of the final Discovery and is idempotent on replay', async () => {
    const seed: InMemoryContentSeed = {
      worlds: [makeWorld()],
      learningPacks: [makePack('ocean-giants', 1)],
      discoveries: [makeDiscovery('blue-whale')],
      memberships: [membership('ocean-giants', 'blue-whale', 1)],
    };
    const { progress, service } = serviceFor(seed);

    await service.revealDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(await progress.getLearningPackProgress(explorerA, oceanGiantsPackId)).toMatchObject({
      completedAt: null,
    });
    expect(await progress.getEarnedBadge(explorerA, oceanWorldId)).toBeNull();

    const first = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(first).toMatchObject({ learningPackCompletedNow: true, worldBadgeEarnedNow: true });

    const replay = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(replay).toEqual({
      discoveryCollectedNow: false,
      packMembershipCompletedNow: false,
      learningPackCompletedNow: false,
      worldBadgeEarnedNow: false,
    });
    expect(await progress.listEarnedBadges(explorerA)).toHaveLength(1);
    expect(progress).not.toHaveProperty('stickers');
  });

  it('requires all required Packs, ignores optional Pack completion, and awards one Badge', async () => {
    const seed: InMemoryContentSeed = {
      worlds: [makeWorld()],
      learningPacks: [
        makePack('ocean-giants', 1),
        makePack('amazing-mammals', 2),
        makePack('ocean-extras', 3, 'optional'),
      ],
      discoveries: [makeDiscovery('blue-whale'), makeDiscovery('dolphin'), makeDiscovery('shark')],
      memberships: [
        membership('ocean-giants', 'blue-whale', 1),
        membership('amazing-mammals', 'dolphin', 1),
        membership('ocean-extras', 'shark', 1),
      ],
    };
    const { progress, service } = serviceFor(seed);

    const afterA = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(afterA.worldBadgeEarnedNow).toBe(false);

    const afterOptional = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: optionalPackId,
      discoveryId: sharkId,
    });
    expect(afterOptional.worldBadgeEarnedNow).toBe(false);

    const afterB = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: amazingMammalsPackId,
      discoveryId: dolphinId,
    });
    expect(afterB.worldBadgeEarnedNow).toBe(true);
    expect(await progress.listEarnedBadges(explorerA)).toHaveLength(1);

    const optionalReplay = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: optionalPackId,
      discoveryId: sharkId,
    });
    expect(optionalReplay.worldBadgeEarnedNow).toBe(false);
    expect(await progress.listEarnedBadges(explorerA)).toHaveLength(1);
  });

  it('allows optional Discoveries without requiring them for Pack completion', async () => {
    const seed: InMemoryContentSeed = {
      worlds: [makeWorld()],
      learningPacks: [makePack('ocean-giants', 1)],
      discoveries: [makeDiscovery('blue-whale'), makeDiscovery('shark')],
      memberships: [
        membership('ocean-giants', 'blue-whale', 1),
        membership('ocean-giants', 'shark', 2, 'optional'),
      ],
    };
    const { progress, service } = serviceFor(seed);
    const result = await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    expect(result.learningPackCompletedNow).toBe(true);
    expect(
      await progress.getPackDiscoveryProgress(explorerA, oceanGiantsPackId, sharkId),
    ).toBeNull();
  });

  it('preserves an earned Badge after a new required Pack is published', async () => {
    const seed: InMemoryContentSeed = {
      worlds: [makeWorld()],
      learningPacks: [makePack('ocean-giants', 1), makePack('amazing-mammals', 2)],
      discoveries: [makeDiscovery('blue-whale'), makeDiscovery('dolphin')],
      memberships: [
        membership('ocean-giants', 'blue-whale', 1),
        membership('amazing-mammals', 'dolphin', 1),
      ],
    };
    const { content, progress, service } = serviceFor(seed);
    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: amazingMammalsPackId,
      discoveryId: dolphinId,
    });
    expect(await progress.getEarnedBadge(explorerA, oceanWorldId)).not.toBeNull();

    const newPackId = parseLearningPackId('deep-ocean');
    const newDiscoveryId = parseDiscoveryId('anglerfish');
    content.learningPacks.push(makePack('deep-ocean', 3));
    content.discoveries.push(makeDiscovery('anglerfish'));
    content.memberships.push(membership('deep-ocean', 'anglerfish', 1));

    expect(await progress.getEarnedBadge(explorerA, oceanWorldId)).not.toBeNull();

    await service.collectDiscovery({
      explorerId: explorerB,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });
    await service.collectDiscovery({
      explorerId: explorerB,
      learningPackId: amazingMammalsPackId,
      discoveryId: dolphinId,
    });
    expect(await progress.getEarnedBadge(explorerB, oceanWorldId)).toBeNull();
    expect(await service.getNextIncompleteDiscovery(explorerB, newPackId)).toMatchObject({
      discovery: { id: newDiscoveryId },
    });
  });
});

describe('multi-World navigation semantics', () => {
  it('does not let a completed World override an unstarted Pack in another World', async () => {
    const spaceWorld = makeWorld('space');
    const spacePack = {
      ...makePack('space-adventures', 1),
      worldId: parseWorldId('space'),
    };
    const oceanPack = makePack('ocean-giants', 1);
    const memberships: LearningPackDiscovery[] = [
      membership('ocean-giants', 'blue-whale', 1),
      membership('space-adventures', 'moon', 1),
    ];
    const { service } = serviceFor({
      worlds: [makeWorld(), spaceWorld],
      learningPacks: [oceanPack, spacePack],
      discoveries: [makeDiscovery('blue-whale'), makeDiscovery('moon')],
      memberships,
    });

    await service.collectDiscovery({
      explorerId: explorerA,
      learningPackId: oceanGiantsPackId,
      discoveryId: blueWhaleId,
    });

    expect(
      (await service.getNextIncompleteDiscovery(explorerA, parseLearningPackId('space-adventures')))
        ?.discovery.id,
    ).toBe(parseDiscoveryId('moon'));
    expect(parseWorldId('space')).not.toBe(parseWorldId('ocean'));
  });
});
