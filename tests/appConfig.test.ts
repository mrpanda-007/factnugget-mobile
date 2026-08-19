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

  it('applies the fail-closed Android backup policy during prebuild', () => {
    expect(appConfig.expo.plugins).toContain('./plugins/withAndroidBackupPolicy');
  });
});
