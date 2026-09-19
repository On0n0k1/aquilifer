import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // activeTab (SPEC — visual design): the toolbar popup shows the current
    // tab's connection/rate-limit status, which needs that tab's URL. Not
    // the broader `tabs` permission — activeTab only grants that access for
    // the tab the user just clicked the toolbar icon on (the gesture that
    // opens the popup itself), never any other tab, and isn't shown in the
    // install-time permission warnings the way `tabs` would be.
    permissions: ['storage', 'notifications', 'activeTab'],
    // Anthropic's host is known ahead of time, so it's granted up front.
    // Self-hosted/local provider URLs are arbitrary and unknown until the
    // user adds one, so they go through optional_host_permissions +
    // browser.permissions.request() at add-provider time instead (SPEC §3).
    host_permissions: ['https://api.anthropic.com/*'],
    optional_host_permissions: ['<all_urls>'],
  },
});
