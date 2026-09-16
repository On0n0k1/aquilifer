// Playwright's documented pattern for testing a loaded MV3 extension (SPEC
// §11) — a persistent context (extensions can't be loaded into an ordinary
// ephemeral `browser.newContext()`) plus the extension id read off its
// service worker's own URL, since an unpacked extension's id isn't known
// ahead of time.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, test as base, chromium } from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(dirname, '../../.output/chrome-mv3');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Playwright requires the first parameter to be an object-destructuring
  // pattern, even an empty one — it statically parses fixture functions to
  // see which fixtures they use, and a plain named parameter isn't
  // recognized the same way.
  // biome-ignore lint/correctness/noEmptyPattern: see above
  context: async ({}, use) => {
    // Empty string userDataDir -> Playwright creates and cleans up a fresh
    // temporary profile per run, so chrome.storage.local (providers, origin
    // grants, rate-limit history) never leaks between test runs.
    //
    // headless: false is required here, not a debugging leftover — MV3
    // extensions (including their background service worker) don't load at
    // all under Playwright's default headless launch, which runs the
    // stripped-down `chrome-headless-shell` binary and force-adds
    // `--disable-extensions` regardless of the args passed above.
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    if (!extensionId) throw new Error('Could not determine extension id.');
    await use(extensionId);
  },
});

export const expect = test.expect;
