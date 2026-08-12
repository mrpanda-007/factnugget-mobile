import { describe, expect, it } from 'vitest';
import { getDiscoveryProgressState } from '../types/domain/progress';
import { parseDiscoveryId, parseExplorerId } from '../types/domain/ids';

const explorerId = parseExplorerId('00000000-0000-4000-8000-000000000001');
const discoveryId = parseDiscoveryId('blue-whale');

describe('derived Discovery progress state', () => {
  it('derives unseen, revealed, and collected from timestamps', () => {
    expect(getDiscoveryProgressState(null)).toBe('unseen');
    expect(
      getDiscoveryProgressState({
        explorerId,
        discoveryId,
        revealedAt: '2026-01-01T00:00:00.000Z',
        collectedAt: null,
      }),
    ).toBe('revealed');
    expect(
      getDiscoveryProgressState({
        explorerId,
        discoveryId,
        revealedAt: '2026-01-01T00:00:00.000Z',
        collectedAt: '2026-01-01T00:01:00.000Z',
      }),
    ).toBe('collected');
  });

  it('treats collected legacy/imported data as inherently revealed', () => {
    expect(
      getDiscoveryProgressState({
        explorerId,
        discoveryId,
        revealedAt: null,
        collectedAt: '2026-01-01T00:01:00.000Z',
      }),
    ).toBe('collected');
  });
});
