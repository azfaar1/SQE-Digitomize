import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './tests/setupTest.js',
    // run in single thread to be safe with mongodb-memory-server
    threads: false,
    testTimeout: 10000,
  },
});
