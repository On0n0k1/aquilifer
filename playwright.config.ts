import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Extension tests share one browser profile's storage per worker — keep
  // them from racing each other until there's a reason to parallelize.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'node tests/e2e/server.mjs',
    port: 4415,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4415',
    trace: 'on-first-retry',
  },
});
