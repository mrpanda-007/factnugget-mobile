import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DiscoveryProgressService } from '../../application/DiscoveryProgressService';
import { initializeDatabase } from '@database/client';
import { migrations } from '@database/schema';
import { SQLiteExplorerRepository } from '@repositories/adapters/SQLiteExplorerRepository';
import { SQLiteProgressRepository } from '@repositories/adapters/SQLiteProgressRepository';
import type { ContentRepositoryContract } from '@repositories/contracts/ContentRepositoryContract';
import type {
  Discovery,
  LearningPack,
  LearningPackDiscovery,
  PackDiscovery,
  World,
} from '@app-types/domain/content';
import {
  parseContentSlug,
  parseDiscoveryId,
  parseLearningPackId,
  parseWorldId,
} from '@app-types/domain/ids';

const DATABASE_NAME = 'factnuggets-phase7-validation.db';
const FIXED_TIME = '2026-08-17T00:00:00.000Z';

interface Result {
  name: string;
  error?: string;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function resetDatabase(): Promise<SQLiteDatabase> {
  try {
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch (error) {
    if (!String(error).includes('not found')) throw error;
  }
  return openDatabaseAsync(DATABASE_NAME);
}

async function seedV1(db: SQLiteDatabase, complete = false, unknownPack = false): Promise<void> {
  await db.execAsync(migrations[0].statements.join('\n'));
  await db.execAsync('PRAGMA user_version = 1;');
  await db.runAsync(
    'INSERT INTO explorer_identity (id, identity_id, chosen_at) VALUES (1, ?, ?);',
    'ocean',
    FIXED_TIME,
  );
  await db.runAsync('INSERT INTO settings (id, sound_enabled) VALUES (1, 1);');
  const deckId = unknownPack ? 'unknown-pack' : 'ocean-secrets';
  await db.runAsync(
    'INSERT INTO deck_progress (deck_id, started_at, last_viewed_at, completed_at) VALUES (?, ?, ?, ?);',
    deckId,
    FIXED_TIME,
    FIXED_TIME,
    complete ? FIXED_TIME : null,
  );
  for (const discoveryId of complete
    ? ['octopus', 'blue-whale', 'shark', 'dolphin']
    : ['octopus', 'blue-whale']) {
    await db.runAsync(
      'INSERT INTO discovery_progress (discovery_id, deck_id, completed_at) VALUES (?, ?, ?);',
      discoveryId,
      deckId,
      FIXED_TIME,
    );
  }
  await db.runAsync(
    'INSERT INTO stickers (sticker_id, discovery_id, earned_at) VALUES (?, ?, ?);',
    'legacy-sticker',
    'octopus',
    FIXED_TIME,
  );
}

function discovery(id: string): Discovery {
  return {
    id: parseDiscoveryId(id),
    slug: parseContentSlug(id),
    title: id,
    subtitle: id,
    headlineFact: id,
    explanation: id,
    deeperExplanation: id,
    advancedExplanation: id,
    images: [],
    fallbackEmoji: '✨',
    estimatedReadingSeconds: 1,
    lifecycle: 'published',
    revision: `${id}-1`,
  };
}

class ValidationContentRepository implements ContentRepositoryContract {
  readonly world: World = {
    id: parseWorldId('ocean'),
    slug: parseContentSlug('ocean'),
    title: 'Ocean',
    tagline: 'Ocean',
    themeKey: 'ocean',
    badge: { title: 'Ocean Badge', icon: '🏆', accessibleDescription: 'Ocean Badge' },
    sortOrder: 1,
    lifecycle: 'published',
    revision: 'world-1',
  };
  readonly packs: LearningPack[] = [
    {
      id: parseLearningPackId('ocean-giants'),
      slug: parseContentSlug('ocean-giants'),
      worldId: this.world.id,
      title: 'Giants',
      subtitle: '',
      sortOrder: 1,
      accessType: 'free',
      completionRole: 'required',
      lifecycle: 'published',
      revision: 'a-1',
    },
    {
      id: parseLearningPackId('amazing-mammals'),
      slug: parseContentSlug('amazing-mammals'),
      worldId: this.world.id,
      title: 'Mammals',
      subtitle: '',
      sortOrder: 2,
      accessType: 'free',
      completionRole: 'required',
      lifecycle: 'published',
      revision: 'b-1',
    },
    {
      id: parseLearningPackId('ocean-extras'),
      slug: parseContentSlug('ocean-extras'),
      worldId: this.world.id,
      title: 'Extras',
      subtitle: '',
      sortOrder: 3,
      accessType: 'free',
      completionRole: 'optional',
      lifecycle: 'published',
      revision: 'c-1',
    },
  ];
  readonly discoveries = ['blue-whale', 'shark', 'dolphin', 'octopus'].map(discovery);
  readonly memberships: LearningPackDiscovery[] = [
    {
      learningPackId: this.packs[0].id,
      discoveryId: parseDiscoveryId('blue-whale'),
      position: 1,
      completionRole: 'required',
    },
    {
      learningPackId: this.packs[0].id,
      discoveryId: parseDiscoveryId('shark'),
      position: 2,
      completionRole: 'required',
    },
    {
      learningPackId: this.packs[0].id,
      discoveryId: parseDiscoveryId('octopus'),
      position: 3,
      completionRole: 'optional',
    },
    {
      learningPackId: this.packs[1].id,
      discoveryId: parseDiscoveryId('blue-whale'),
      position: 1,
      completionRole: 'required',
    },
    {
      learningPackId: this.packs[1].id,
      discoveryId: parseDiscoveryId('dolphin'),
      position: 2,
      completionRole: 'required',
    },
    {
      learningPackId: this.packs[2].id,
      discoveryId: parseDiscoveryId('octopus'),
      position: 1,
      completionRole: 'required',
    },
  ];
  async listWorlds() {
    return [this.world];
  }
  async getWorld(id: World['id']) {
    return id === this.world.id ? this.world : null;
  }
  async listLearningPacksForWorld(id: World['id']) {
    return id === this.world.id ? this.packs : [];
  }
  async getLearningPack(id: LearningPack['id']) {
    return this.packs.find((pack) => pack.id === id) ?? null;
  }
  async listPackDiscoveries(id: LearningPack['id']): Promise<PackDiscovery[]> {
    return this.memberships
      .filter((membership) => membership.learningPackId === id)
      .map((membership) => ({
        membership,
        discovery: this.discoveries.find((item) => item.id === membership.discoveryId)!,
      }));
  }
  async getDiscovery(id: Discovery['id']) {
    return this.discoveries.find((item) => item.id === id) ?? null;
  }
}

async function runValidation(): Promise<Result[]> {
  const results: Result[] = [];
  const scenario = async (name: string, work: () => Promise<void>) => {
    try {
      await work();
      results.push({ name });
    } catch (error) {
      results.push({ name, error: error instanceof Error ? error.message : String(error) });
    }
  };

  await scenario('Fresh v2 schema', async () => {
    const db = await resetDatabase();
    await initializeDatabase(db);
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table';",
    );
    expect(version?.user_version === 2, 'schema version is not 2');
    for (const table of [
      'local_explorers',
      'device_settings',
      'discovery_progress',
      'pack_discovery_progress',
      'learning_pack_progress',
      'earned_badges',
      'stickers',
    ])
      expect(
        tables.some((row) => row.name === table),
        `missing ${table}`,
      );
    expect(
      (await db.getFirstAsync('SELECT id FROM local_explorers LIMIT 1;')) === null,
      'fresh database created an Explorer',
    );
    await db.closeAsync();
  });

  await scenario('V1 migration, legacy progress, Badge, and stickers', async () => {
    const db = await resetDatabase();
    await seedV1(db, true);
    await initializeDatabase(db);
    const explorer = await db.getFirstAsync<{ id: string; look_id: string; created_at: string }>(
      'SELECT id, look_id, created_at FROM local_explorers;',
    );
    const settings = await db.getFirstAsync<{ active_explorer_id: string; sound_enabled: number }>(
      'SELECT active_explorer_id, sound_enabled FROM device_settings;',
    );
    expect(Boolean(explorer?.id.match(/^[0-9a-f-]{36}$/i)), 'Explorer UUID was not created');
    expect(
      explorer?.look_id === 'ocean' && explorer.created_at === FIXED_TIME,
      'identity did not migrate',
    );
    expect(
      settings?.active_explorer_id === explorer?.id && settings.sound_enabled === 1,
      'active Explorer/settings did not migrate',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM discovery_progress;')).length === 4,
      'Discovery rows did not migrate',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM pack_discovery_progress;')).length === 4,
      'Pack rows did not migrate',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM earned_badges WHERE world_id = "ocean";')).length === 1,
      'Ocean Badge did not migrate',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM stickers;')).length === 1,
      'legacy sticker was lost',
    );
    await db.closeAsync();
  });

  await scenario('Partial v1 progress migration', async () => {
    const db = await resetDatabase();
    await seedV1(db);
    await initializeDatabase(db);
    const explorer = await db.getFirstAsync<{ id: string }>('SELECT id FROM local_explorers;');
    expect(explorer !== null, 'partial migration did not create Explorer');
    expect(
      (
        await db.getAllAsync(
          'SELECT * FROM discovery_progress WHERE explorer_id = ? AND collected_at IS NOT NULL;',
          explorer.id,
        )
      ).length === 2,
      'partial Discoveries did not migrate',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM earned_badges;')).length === 0,
      'partial Pack earned a Badge',
    );
    expect(
      (
        await db.getFirstAsync<{ completed_at: string | null }>(
          'SELECT completed_at FROM learning_pack_progress WHERE learning_pack_id = "ocean-secrets";',
        )
      )?.completed_at === null,
      'partial Pack was incorrectly completed',
    );
    await db.closeAsync();
  });

  await scenario('Unknown legacy Pack retains completion without Badge', async () => {
    const db = await resetDatabase();
    await seedV1(db, true, true);
    await initializeDatabase(db);
    expect(
      (
        await db.getAllAsync(
          'SELECT * FROM learning_pack_progress WHERE learning_pack_id = "unknown-pack";',
        )
      ).length === 1,
      'unknown Pack progress was lost',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM earned_badges;')).length === 0,
      'unknown Pack invented a Badge',
    );
    await db.closeAsync();
  });

  await scenario('Migration rollback', async () => {
    const db = await resetDatabase();
    await seedV1(db);
    try {
      await initializeDatabase(db, {
        beforeVersionTwoCommit: () => {
          throw new Error('controlled rollback');
        },
      });
    } catch {
      /* expected */
    }
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        1,
      'rollback advanced version',
    );
    expect(
      (await db.getAllAsync('SELECT * FROM discovery_progress;')).length === 2,
      'rollback lost legacy rows',
    );
    await initializeDatabase(db);
    expect(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ===
        2,
      'retry did not migrate',
    );
    await db.closeAsync();
  });

  await scenario('Foreign keys and Explorer-scoped service', async () => {
    const db = await resetDatabase();
    await initializeDatabase(db);
    expect(
      (await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;'))?.foreign_keys ===
        1,
      'foreign keys are disabled',
    );
    let rejected = false;
    try {
      await db.runAsync(
        'UPDATE device_settings SET active_explorer_id = ? WHERE id = 1;',
        'not-an-explorer',
      );
    } catch {
      rejected = true;
    }
    expect(rejected, 'invalid active Explorer was accepted');
    const explorers = new SQLiteExplorerRepository(() => Promise.resolve(db));
    const progress = new SQLiteProgressRepository(() => Promise.resolve(db));
    const content = new ValidationContentRepository();
    const service = new DiscoveryProgressService({ content, progress, now: () => FIXED_TIME });
    const a = await explorers.createExplorer('ocean');
    const b = await explorers.createExplorer('space');
    await explorers.setActiveExplorer(a.id);
    const blue = parseDiscoveryId('blue-whale');
    const packA = parseLearningPackId('ocean-giants');
    const packB = parseLearningPackId('amazing-mammals');
    const packC = parseLearningPackId('ocean-extras');
    await service.revealDiscovery({ explorerId: a.id, learningPackId: packA, discoveryId: blue });
    expect(
      (await progress.getDiscoveryProgress(a.id, blue))?.collectedAt === null,
      'reveal collected Discovery',
    );
    await service.collectDiscovery({ explorerId: a.id, learningPackId: packA, discoveryId: blue });
    expect((await progress.getDiscoveryProgress(b.id, blue)) === null, 'Explorer isolation failed');
    expect(
      (await progress.getPackDiscoveryProgress(a.id, packB, blue)) === null,
      'shared Discovery completed another Pack',
    );
    await service.collectDiscovery({ explorerId: a.id, learningPackId: packB, discoveryId: blue });
    expect(
      (await progress.listCollectedDiscoveryIds(a.id)).filter((id) => id === blue).length === 1,
      'shared Discovery duplicated globally',
    );
    await service.collectDiscovery({
      explorerId: a.id,
      learningPackId: packA,
      discoveryId: parseDiscoveryId('shark'),
    });
    const completedAt = (await progress.getLearningPackProgress(a.id, packA))?.completedAt;
    await service.collectDiscovery({
      explorerId: a.id,
      learningPackId: packA,
      discoveryId: parseDiscoveryId('octopus'),
    });
    expect(
      (await progress.getLearningPackProgress(a.id, packA))?.completedAt === completedAt,
      'optional membership changed completion',
    );
    await service.collectDiscovery({
      explorerId: a.id,
      learningPackId: packC,
      discoveryId: parseDiscoveryId('octopus'),
    });
    expect(
      (await progress.getEarnedBadge(a.id, parseWorldId('ocean'))) === null,
      'optional Pack earned a Badge before required Packs completed',
    );
    await service.collectDiscovery({
      explorerId: a.id,
      learningPackId: packB,
      discoveryId: parseDiscoveryId('dolphin'),
    });
    const badge = await progress.getEarnedBadge(a.id, parseWorldId('ocean'));
    expect(Boolean(badge), 'required Packs did not earn Badge');
    await service.collectDiscovery({
      explorerId: a.id,
      learningPackId: packB,
      discoveryId: parseDiscoveryId('dolphin'),
    });
    expect((await progress.listEarnedBadges(a.id)).length === 1, 'replay duplicated Badge');
    const earnedAt = badge?.earnedAt;

    content.packs.push({
      id: parseLearningPackId('deep-ocean'),
      slug: parseContentSlug('deep-ocean'),
      worldId: content.world.id,
      title: 'Deep Ocean',
      subtitle: '',
      sortOrder: 4,
      accessType: 'free',
      completionRole: 'required',
      lifecycle: 'published',
      revision: 'd-2',
    });
    content.discoveries.push(discovery('anglerfish'));
    content.memberships.push({
      learningPackId: parseLearningPackId('deep-ocean'),
      discoveryId: parseDiscoveryId('anglerfish'),
      position: 1,
      completionRole: 'required',
    });
    expect(
      (await progress.getEarnedBadge(a.id, parseWorldId('ocean')))?.earnedAt === earnedAt,
      'historical Badge was revoked after new content',
    );
    await service.collectDiscovery({ explorerId: b.id, learningPackId: packA, discoveryId: blue });
    await service.collectDiscovery({
      explorerId: b.id,
      learningPackId: packA,
      discoveryId: parseDiscoveryId('shark'),
    });
    await service.collectDiscovery({ explorerId: b.id, learningPackId: packB, discoveryId: blue });
    await service.collectDiscovery({
      explorerId: b.id,
      learningPackId: packB,
      discoveryId: parseDiscoveryId('dolphin'),
    });
    expect(
      (await progress.getEarnedBadge(b.id, parseWorldId('ocean'))) === null,
      'new Explorer earned historical Badge without new required Pack',
    );
    await service.collectDiscovery({
      explorerId: b.id,
      learningPackId: parseLearningPackId('deep-ocean'),
      discoveryId: parseDiscoveryId('anglerfish'),
    });
    expect(
      Boolean(await progress.getEarnedBadge(b.id, parseWorldId('ocean'))),
      'new Explorer did not earn Badge',
    );
    await db.closeAsync();
    const reopened = await openDatabaseAsync(DATABASE_NAME);
    await initializeDatabase(reopened);
    const restarted = new SQLiteProgressRepository(() => Promise.resolve(reopened));
    expect(
      Boolean(await restarted.getEarnedBadge(a.id, parseWorldId('ocean'))),
      'restart lost Badge',
    );
    expect(
      (await restarted.getDiscoveryProgress(a.id, blue))?.collectedAt === FIXED_TIME,
      'restart lost Discovery progress',
    );
    await reopened.closeAsync();
  });

  return results;
}

export function Phase7SQLiteValidationScreen() {
  const [results, setResults] = useState<Result[] | null>(null);
  useEffect(() => {
    void runValidation().then(setResults);
  }, []);
  const passed = results?.filter((result) => !result.error).length ?? 0;
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 16, backgroundColor: '#FFF9EC' }}>
      <Text style={{ fontSize: 26, fontWeight: '700' }}>Phase 7 SQLite validation</Text>
      <Text>
        {results
          ? `${passed}/${results.length} scenarios passed`
          : 'Running on isolated native SQLite database…'}
      </Text>
      {results?.map((result) => (
        <View key={result.name}>
          <Text style={{ color: result.error ? '#B42318' : '#137333' }}>
            {result.error ? `✗ ${result.name}: ${result.error}` : `✓ ${result.name}`}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
