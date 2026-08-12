import { defineConfig } from 'vitest/config';

function fromRoot(path) {
  return new URL(path, import.meta.url).pathname;
}

export default defineConfig({
  resolve: {
    alias: {
      '@app': fromRoot('./app'),
      '@assets': fromRoot('./assets'),
      '@components': fromRoot('./components'),
      '@features': fromRoot('./features'),
      '@hooks': fromRoot('./hooks'),
      '@navigation': fromRoot('./navigation'),
      '@providers': fromRoot('./providers'),
      '@repositories': fromRoot('./repositories'),
      '@services': fromRoot('./services'),
      '@store': fromRoot('./store'),
      '@database': fromRoot('./database'),
      '@app-types': fromRoot('./types'),
      '@constants': fromRoot('./constants'),
      '@utils': fromRoot('./utils'),
      '@animations': fromRoot('./animations'),
      '@firebase-config': fromRoot('./firebase'),
    },
  },
  test: {
    environment: 'node',
  },
});
