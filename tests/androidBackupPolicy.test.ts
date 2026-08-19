import { describe, expect, it } from 'vitest';

// The Expo config plugin is CommonJS because Expo loads config plugins through Node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const backupPolicy = require('../plugins/withAndroidBackupPolicy');

describe('Android OS backup policy', () => {
  it('disables default backup and points both Android rule formats at explicit exclusions', () => {
    const manifest = {
      manifest: {
        application: [{ $: { 'android:allowBackup': 'true' } }],
      },
    };

    expect(backupPolicy.configureAndroidManifest(manifest)).toEqual({
      manifest: {
        application: [
          {
            $: {
              'android:allowBackup': 'false',
              'android:fullBackupContent': '@xml/factnuggets_backup_rules',
              'android:dataExtractionRules': '@xml/factnuggets_data_extraction_rules',
            },
          },
        ],
      },
    });
  });

  it('excludes databases, shared preferences, files, and device-protected storage', () => {
    for (const rules of [backupPolicy.BACKUP_RULES, backupPolicy.DATA_EXTRACTION_RULES]) {
      expect(rules).toContain('<exclude domain="database" path="." />');
      expect(rules).toContain('<exclude domain="sharedpref" path="." />');
      expect(rules).toContain('<exclude domain="file" path="." />');
      expect(rules).toContain('<exclude domain="device_database" path="." />');
      expect(rules).toContain('<exclude domain="device_sharedpref" path="." />');
    }

    expect(backupPolicy.DATA_EXTRACTION_RULES).toContain('<cloud-backup>');
    expect(backupPolicy.DATA_EXTRACTION_RULES).toContain('<device-transfer>');
  });
});
