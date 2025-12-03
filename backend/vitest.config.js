// backend/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './tests/setupTest.js',
    threads: false,       // run tests in a single thread (avoid race issues in CI)
    testTimeout: 10000,   // increase if some tests need more time
  },
});
