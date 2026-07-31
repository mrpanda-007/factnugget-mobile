// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // 11-coding-standards.md: TypeScript strict mode, "No any."
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
