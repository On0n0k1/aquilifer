import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    setupFiles: ['./tests/setup.ts'],
    // tests/e2e/**/*.spec.ts are Playwright specs (import @playwright/test,
    // not vitest) — vitest's default file discovery would otherwise try to
    // run them and fail.
    exclude: ['**/node_modules/**', '**/.output/**', 'tests/e2e/**'],
  },
});
