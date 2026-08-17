import { describe, expect, it } from 'vitest';
import appConfig from '../app.json';

describe('Expo application identity', () => {
  it('uses the approved FactNuggets bundle and package identifiers', () => {
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.factnuggets.app');
    expect(appConfig.expo.android.package).toBe('com.factnuggets.app');
  });

  it('keeps the approved FactNuggets display name', () => {
    expect(appConfig.expo.name).toBe('FactNuggets');
  });
});
