// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: "./tests/setupTest.js",
    threads: false,
    testTimeout: 20000,
  },
});
