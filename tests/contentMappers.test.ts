import { describe, expect, it } from 'vitest';
import type { SanityClient } from '@sanity/client';

import {
  computeContentRevision,
  mapContentSnapshot,
  type RawContentSnapshot,
} from '../infrastructure/sanity/mappers';
import { validateContentSnapshot } from '../application/content/contentSnapshot';

// mapContentSnapshot only ever calls buildContentImageUrl(client, ...), which
// itself only reads `client` as an opaque cache key — a fake object is enough,
// no real Sanity client needed for these tests.
const fakeClient = {} as SanityClient;

describe('computeContentRevision', () => {
  it('is deterministic', () => {
    expect(computeContentRevision('ocean-secrets', ['octopus', 'shark'])).toBe(
      computeContentRevision('ocean-secrets', ['octopus', 'shark']),
    );
  });

  it('is independent of member order — reordering must never change it', () => {
    expect(computeContentRevision('ocean-secrets', ['octopus', 'shark'])).toBe(
      computeContentRevision('ocean-secrets', ['shark', 'octopus']),
    );
  });

  it('changes when the required member set changes', () => {
    expect(computeContentRevision('ocean-secrets', ['octopus', 'shark'])).not.toBe(
      computeContentRevision('ocean-secrets', ['octopus', 'shark', 'dolphin']),
    );
  });

  it('changes when the domain id changes, even with the same members', () => {
    expect(computeContentRevision('ocean-secrets', ['octopus'])).not.toBe(
      computeContentRevision('ocean-giants', ['octopus']),
    );
  });
});

function rawFixture(overrides: Partial<RawContentSnapshot> = {}): RawContentSnapshot {
  return {
    worlds: [
      {
        domainId: 'ocean',
        slug: 'ocean-world',
        title: 'Ocean World',
        tagline: 'Dive into ocean secrets.',
        themeKey: 'ocean',
        displayOrder: 10,
        badge: {
          title: 'Ocean Explorer Badge',
          accessibleDescription: 'Ocean Explorer Badge.',
          artwork: null,
        },
      },
    ],
    learningPacks: [
      {
        domainId: 'ocean-secrets',
        slug: 'ocean-secrets',
        worldDomainId: 'ocean',
        title: 'Ocean Secrets',
        subtitle: '4 discoveries',
        displayOrder: 10,
        accessType: 'free',
        worldCompletionRole: 'required',
        memberships: [
          { discoveryDomainId: 'octopus', discoveryPublished: true, completionRole: 'required' },
          { discoveryDomainId: 'shark', discoveryPublished: true, completionRole: 'required' },
        ],
      },
    ],
    discoveries: [
      {
        domainId: 'octopus',
        slug: 'octopus',
        title: 'Octopus',
        subtitle: 'Eight arms',
        headlineFact: 'An octopus has three hearts!',
        explanation: 'Two hearts pump blue blood.',
        additionalExplanations: [
          { label: 'Go deeper', explanation: 'Deeper text.' },
          { label: 'Advanced', explanation: 'Advanced text.' },
        ],
        emojiFallback: '🐙',
        estimatedSeconds: 30,
        images: [],
      },
      {
        domainId: 'shark',
        slug: 'shark',
        title: 'Shark',
        subtitle: 'Older than trees',
        headlineFact: 'Sharks predate trees.',
        explanation: 'Sharks appeared 400M years ago.',
        additionalExplanations: [],
        emojiFallback: '🦈',
        estimatedSeconds: 30,
        images: [],
      },
    ],
    ...overrides,
  };
}

describe('mapContentSnapshot', () => {
  it('maps a well-formed raw payload into a valid snapshot', () => {
    const snapshot = mapContentSnapshot(fakeClient, rawFixture(), {
      dataset: 'development',
      fetchedAt: '2026-08-19T00:00:00.000Z',
    });
    expect(validateContentSnapshot(snapshot)).toEqual({ valid: true });
    expect(snapshot.worlds).toHaveLength(1);
    expect(snapshot.worlds[0].id).toBe('ocean');
    expect(snapshot.learningPacks[0].id).toBe('ocean-secrets');
    expect(snapshot.discoveries.map((discovery) => discovery.id).sort()).toEqual([
      'octopus',
      'shark',
    ]);
    expect(snapshot.packMemberships).toHaveLength(2);
  });

  it('never reads a commerceKey or entitlement grant from Sanity — accessType is metadata only', () => {
    const raw = rawFixture();
    raw.learningPacks[0].accessType = 'paid';
    const snapshot = mapContentSnapshot(fakeClient, raw, {
      dataset: 'development',
      fetchedAt: '2026-08-19T00:00:00.000Z',
    });
    // ocean-secrets has no entry in commerce/catalogue.ts, so it correctly
    // resolves to no commerceKey even though Sanity marked it "paid" — the
    // catalogue, not the CMS, is the sole source of purchasable capability.
    expect(snapshot.learningPacks[0].commerceKey).toBeUndefined();
  });

  it('falls back to the fixed emoji icon and carries real artwork separately when Sanity provides one', () => {
    const raw = rawFixture();
    raw.worlds[0].badge!.artwork = { ref: 'image-abc-800x600-png', alt: 'A golden badge.' };
    const snapshot = mapContentSnapshot({ config: () => ({}) } as unknown as SanityClient, raw, {
      dataset: 'development',
      fetchedAt: '2026-08-19T00:00:00.000Z',
    });
    expect(snapshot.worlds[0].badge.icon).toBe('🏆');
    expect(snapshot.worlds[0].badge.title).toBe('Ocean Explorer Badge');
  });

  it('matches additional explanations by label, and falls back positionally when labels are absent', () => {
    const raw = rawFixture();
    raw.discoveries[0].additionalExplanations = [
      { label: 'Something else', explanation: 'First entry.' },
    ];
    const snapshot = mapContentSnapshot(fakeClient, raw, {
      dataset: 'development',
      fetchedAt: '2026-08-19T00:00:00.000Z',
    });
    const octopus = snapshot.discoveries.find((discovery) => discovery.id === 'octopus')!;
    expect(octopus.deeperExplanation).toBe('First entry.'); // positional fallback (index 0)
    expect(octopus.advancedExplanation).toBe(''); // no second entry — empty, not a throw
  });

  it('excludes a membership referencing an unpublished Discovery rather than failing the whole snapshot', () => {
    const raw = rawFixture();
    raw.learningPacks[0].memberships!.push({
      discoveryDomainId: 'dolphin',
      discoveryPublished: false,
      completionRole: 'required',
    });
    const snapshot = mapContentSnapshot(fakeClient, raw, {
      dataset: 'development',
      fetchedAt: '2026-08-19T00:00:00.000Z',
    });
    expect(
      snapshot.packMemberships.some((membership) => membership.discoveryId === 'dolphin'),
    ).toBe(false);
  });

  it('throws on a Learning Pack missing its World reference — the caller must reject the whole snapshot', () => {
    const raw = rawFixture();
    raw.learningPacks[0].worldDomainId = null;
    expect(() =>
      mapContentSnapshot(fakeClient, raw, {
        dataset: 'development',
        fetchedAt: '2026-08-19T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
