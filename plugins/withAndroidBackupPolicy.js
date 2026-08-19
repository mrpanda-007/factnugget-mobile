const fs = require('node:fs');
const path = require('node:path');

const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const BACKUP_RULES_FILE = 'factnuggets_backup_rules.xml';
const DATA_EXTRACTION_RULES_FILE = 'factnuggets_data_extraction_rules.xml';

const BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="root" path="." />
    <exclude domain="file" path="." />
    <exclude domain="database" path="." />
    <exclude domain="sharedpref" path="." />
    <exclude domain="external" path="." />
    <exclude domain="device_root" path="." />
    <exclude domain="device_file" path="." />
    <exclude domain="device_database" path="." />
    <exclude domain="device_sharedpref" path="." />
</full-backup-content>
`;

const DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" path="." />
        <exclude domain="file" path="." />
        <exclude domain="database" path="." />
        <exclude domain="sharedpref" path="." />
        <exclude domain="external" path="." />
        <exclude domain="device_root" path="." />
        <exclude domain="device_file" path="." />
        <exclude domain="device_database" path="." />
        <exclude domain="device_sharedpref" path="." />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" path="." />
        <exclude domain="file" path="." />
        <exclude domain="database" path="." />
        <exclude domain="sharedpref" path="." />
        <exclude domain="external" path="." />
        <exclude domain="device_root" path="." />
        <exclude domain="device_file" path="." />
        <exclude domain="device_database" path="." />
        <exclude domain="device_sharedpref" path="." />
    </device-transfer>
</data-extraction-rules>
`;

function configureAndroidManifest(androidManifest) {
  const application = androidManifest.manifest.application?.[0];
  if (!application) {
    throw new Error('Unable to find the Android application manifest entry.');
  }

  application.$ = application.$ ?? {};
  application.$['android:allowBackup'] = 'false';
  application.$['android:fullBackupContent'] = '@xml/factnuggets_backup_rules';
  application.$['android:dataExtractionRules'] = '@xml/factnuggets_data_extraction_rules';
  return androidManifest;
}

function writeBackupResources(projectRoot) {
  const xmlDirectory = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
  fs.mkdirSync(xmlDirectory, { recursive: true });
  fs.writeFileSync(path.join(xmlDirectory, BACKUP_RULES_FILE), BACKUP_RULES);
  fs.writeFileSync(path.join(xmlDirectory, DATA_EXTRACTION_RULES_FILE), DATA_EXTRACTION_RULES);
}

module.exports = function withAndroidBackupPolicy(config) {
  config = withAndroidManifest(config, (androidConfig) => {
    androidConfig.modResults = configureAndroidManifest(androidConfig.modResults);
    return androidConfig;
  });

  return withDangerousMod(config, [
    'android',
    (androidConfig) => {
      writeBackupResources(androidConfig.modRequest.projectRoot);
      return androidConfig;
    },
  ]);
};

module.exports.configureAndroidManifest = configureAndroidManifest;
module.exports.writeBackupResources = writeBackupResources;
module.exports.BACKUP_RULES = BACKUP_RULES;
module.exports.DATA_EXTRACTION_RULES = DATA_EXTRACTION_RULES;
