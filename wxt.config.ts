import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
    // Anthropic's host is known ahead of time, so it's granted up front.
    // Self-hosted/local provider URLs are arbitrary and unknown until the
    // user adds one, so they go through optional_host_permissions +
    // browser.permissions.request() at add-provider time instead (SPEC §3).
    host_permissions: ['https://api.anthropic.com/*'],
    optional_host_permissions: ['<all_urls>'],
  },
});
