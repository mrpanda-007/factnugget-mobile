const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_SETUP = `// FACTNUGGETS_RELEASE_SIGNING_START
def factNuggetsSigningValue = { String name ->
    def environmentValue = System.getenv(name)
    if (environmentValue != null && !environmentValue.trim().isEmpty()) {
        return environmentValue
    }

    def propertyValue = findProperty(name)
    return propertyValue != null && !propertyValue.toString().trim().isEmpty()
        ? propertyValue.toString()
        : null
}

def factNuggetsReleaseSigning = [
    keystorePath: factNuggetsSigningValue('FACTNUGGETS_ANDROID_KEYSTORE_PATH'),
    keystorePassword: factNuggetsSigningValue('FACTNUGGETS_ANDROID_KEYSTORE_PASSWORD'),
    keyAlias: factNuggetsSigningValue('FACTNUGGETS_ANDROID_KEY_ALIAS'),
    keyPassword: factNuggetsSigningValue('FACTNUGGETS_ANDROID_KEY_PASSWORD'),
]
def factNuggetsSigningValueCount = factNuggetsReleaseSigning.values().count { it != null }
def factNuggetsHasReleaseSigning = factNuggetsSigningValueCount == factNuggetsReleaseSigning.size()
def factNuggetsAllowUnsignedRelease = (factNuggetsSigningValue('FACTNUGGETS_ANDROID_ALLOW_UNSIGNED_RELEASE') ?: 'false').toBoolean()
def factNuggetsReleaseRequested = gradle.startParameter.taskNames.any {
    it.toLowerCase().contains('release')
}

if (factNuggetsSigningValueCount > 0 && !factNuggetsHasReleaseSigning) {
    throw new GradleException('Incomplete FactNuggets Android release signing configuration. Set all four FACTNUGGETS_ANDROID_KEYSTORE_PATH, FACTNUGGETS_ANDROID_KEYSTORE_PASSWORD, FACTNUGGETS_ANDROID_KEY_ALIAS, and FACTNUGGETS_ANDROID_KEY_PASSWORD values.')
}

if (factNuggetsReleaseRequested && !factNuggetsHasReleaseSigning && !factNuggetsAllowUnsignedRelease) {
    throw new GradleException('FactNuggets Android release signing is not configured. Provide all FACTNUGGETS_ANDROID_* signing values, or set FACTNUGGETS_ANDROID_ALLOW_UNSIGNED_RELEASE=true only for local compile validation.')
}
// FACTNUGGETS_RELEASE_SIGNING_END

`;

const RELEASE_SIGNING_CONFIG = `        release {
            if (factNuggetsHasReleaseSigning) {
                storeFile file(factNuggetsReleaseSigning.keystorePath)
                storePassword factNuggetsReleaseSigning.keystorePassword
                keyAlias factNuggetsReleaseSigning.keyAlias
                keyPassword factNuggetsReleaseSigning.keyPassword
            }
        }
`;

function addReleaseSigning(buildGradle) {
  if (!buildGradle.includes('// FACTNUGGETS_RELEASE_SIGNING_START')) {
    const androidBlock = 'android {';
    if (!buildGradle.includes(androidBlock)) {
      throw new Error('Unable to find the Android Gradle configuration block.');
    }
    buildGradle = buildGradle.replace(androidBlock, `${SIGNING_SETUP}${androidBlock}`);
  }

  if (!buildGradle.includes('        release {\n            if (factNuggetsHasReleaseSigning) {')) {
    const signingConfigsBlock = '    signingConfigs {\n';
    if (!buildGradle.includes(signingConfigsBlock)) {
      throw new Error('Unable to find the Android signingConfigs block.');
    }
    buildGradle = buildGradle.replace(
      signingConfigsBlock,
      `${signingConfigsBlock}${RELEASE_SIGNING_CONFIG}`,
    );
  }

  const debugFallback = '            signingConfig signingConfigs.debug\n';
  const releaseBlockStart = buildGradle.indexOf(
    '        release {',
    buildGradle.indexOf('    buildTypes {'),
  );
  const releaseBlockEnd = buildGradle.indexOf('        }', releaseBlockStart);
  if (releaseBlockStart === -1 || releaseBlockEnd === -1) {
    throw new Error('Unable to find the Android release build type.');
  }

  const releaseBlock = buildGradle.slice(releaseBlockStart, releaseBlockEnd);
  let safeReleaseBlock = releaseBlock.replace(debugFallback, '');
  if (!safeReleaseBlock.includes('factNuggetsHasReleaseSigning')) {
    safeReleaseBlock = safeReleaseBlock.replace(
      '        release {\n',
      '        release {\n            if (factNuggetsHasReleaseSigning) {\n                signingConfig signingConfigs.release\n            }\n',
    );
  }

  return `${buildGradle.slice(0, releaseBlockStart)}${safeReleaseBlock}${buildGradle.slice(releaseBlockEnd)}`;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (androidConfig) => {
    if (androidConfig.modResults.language !== 'groovy') {
      throw new Error('FactNuggets Android release signing requires a Groovy app build.gradle.');
    }
    androidConfig.modResults.contents = addReleaseSigning(androidConfig.modResults.contents);
    return androidConfig;
  });
};
