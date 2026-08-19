import { describe, expect, it } from 'vitest';

import { createSanityContentClient } from '../infrastructure/sanity/sanityClient';
import { fetchRemoteSnapshot } from '../infrastructure/sanity/fetchRemoteSnapshot';

/**
 * REAL network reads against project bhgo6qa7 — not fixtures. Self-gated
 * exactly like tests/firestoreRules.test.ts/familyBootstrapFunctions.test.ts:
 * present in the default `npm test` glob but skipped unless explicitly
 * enabled (see package.json "test:sanity-live-read"), so the default suite
 * never depends on network access.
 *
 * Read-only: this file must never import a client configured with a token,
 * and must never call anything but fetchRemoteSnapshot.
 *
 * IMPORTANT: `sanity dataset visibility get development` returns "private" —
 * confirmed directly against the live project. A tokenless client (which is
 * everything this mobile app is allowed to ship — Phase 11C.2 §26/§88
 * forbids any Sanity credential in the bundle) therefore CANNOT read
 * development at all, by Sanity's own access control, not a bug here. Only
 * `production` (visibility: "public") is reachable from an installed app.
 * This is exactly why the project's own .env already points local dev at the
 * `production` dataset rather than `development`.
 */
const enabled = process.env.SANITY_LIVE_READ_TEST === 'true';

describe.skipIf(!enabled)('live read: Sanity, exactly as an installed app would read it', () => {
  it('a tokenless client reads the promoted Ocean World content from the public production dataset', async () => {
    const client = createSanityContentClient('production', 'bhgo6qa7');
    const result = await fetchRemoteSnapshot(client, 'production');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { snapshot } = result;
    expect(snapshot.dataset).toBe('production');
    expect(snapshot.source).toBe('sanity');

    const ocean = snapshot.worlds.find((world) => world.id === 'ocean');
    expect(ocean?.title).toBe('Ocean World');
    expect(ocean?.badge.title).toBe('Ocean Explorer Badge');

    const oceanSecrets = snapshot.learningPacks.find((pack) => pack.id === 'ocean-secrets');
    expect(oceanSecrets?.worldId).toBe('ocean');
    expect(oceanSecrets?.accessType).toBe('free');
    // Content never grants entitlement, even for a Pack marked free in the
    // CMS — commerceKey only ever comes from the engineering-owned catalogue.
    expect(oceanSecrets?.commerceKey).toBeUndefined();

    const discoveryIds = snapshot.discoveries.map((discovery) => discovery.id).sort();
    expect(discoveryIds).toEqual(['blue-whale', 'dolphin', 'octopus', 'shark']);

    const membershipIds = snapshot.packMemberships
      .filter((membership) => membership.learningPackId === 'ocean-secrets')
      .map((membership) => membership.discoveryId)
      .sort();
    expect(membershipIds).toEqual(['blue-whale', 'dolphin', 'octopus', 'shark']);
  }, 20000);

  it('a tokenless client cannot read the private development dataset — Sanity itself refuses it', async () => {
    const client = createSanityContentClient('development', 'bhgo6qa7');
    const result = await fetchRemoteSnapshot(client, 'development');

    if (result.ok) {
      // If Sanity's access control ever changes and this starts succeeding,
      // it must never see real content without a token — that would mean the
      // dataset went public, which is itself worth failing loudly for.
      expect(result.snapshot.worlds).toEqual([]);
    } else {
      expect(result.error.code).toBe('networkUnavailable');
    }
  }, 20000);
});
