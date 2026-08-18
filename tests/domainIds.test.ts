import { describe, expect, it } from 'vitest';
import {
  CONTENT_ID_PATTERN,
  createExplorerId,
  createFamilyId,
  parseAuthUserId,
  parseContentSlug,
  parseDiscoveryId,
  parseExplorerId,
  parseFamilyId,
  parseLearningPackId,
  parseWorldId,
} from '../types/domain/ids';

describe('canonical domain IDs', () => {
  it.each(['a', 'ocean', 'ocean-secrets', 'blue-whale2', 'a1-b2'])(
    'accepts the immutable content ID %s',
    (value) => {
      expect(CONTENT_ID_PATTERN.test(value)).toBe(true);
      expect(parseWorldId(value)).toBe(value);
      expect(parseLearningPackId(value)).toBe(value);
      expect(parseDiscoveryId(value)).toBe(value);
    },
  );

  it.each([
    '',
    'Ocean',
    'ocean_secrets',
    '-ocean',
    'ocean-',
    'ocean--secrets',
    '1ocean',
    'ocean secrets',
    'ocean/sea',
  ])('rejects the invalid content ID %j', (value) => {
    expect(() => parseWorldId(value)).toThrow();
    expect(() => parseLearningPackId(value)).toThrow();
    expect(() => parseDiscoveryId(value)).toThrow();
  });

  it('keeps slugs conceptually separate without imposing the ID policy', () => {
    expect(parseContentSlug('Blue Whale facts')).toBe('Blue Whale facts');
    expect(() => parseContentSlug('   ')).toThrow();
  });

  it('creates opaque UUID Explorer IDs instead of deriving them from a look', () => {
    const first = createExplorerId();
    const second = createExplorerId();
    expect(parseExplorerId(first)).toBe(first);
    expect(first).not.toBe(second);
    expect(() => parseExplorerId('ocean')).toThrow();
  });

  it('creates Family IDs independently from Explorer and parent Auth identities', () => {
    const familyId = createFamilyId();
    expect(parseFamilyId(familyId)).toBe(familyId);
    expect(parseAuthUserId('firebase-parent-uid')).toBe('firebase-parent-uid');
    expect(() => parseAuthUserId('parent/uid')).toThrow();
    expect(() => parseFamilyId('family')).toThrow();
  });
});
