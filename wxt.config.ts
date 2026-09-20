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
    host_permissions: ['https://api.anthropic.com/*'],
    // No optional_host_permissions entry: the content scripts below already
    // require <all_urls> (SPEC §4 — window.aquilifer is injected on every
    // page by design), which Chrome folds into the extension's effective
    // origin access on its own. Declaring <all_urls> again here as optional
    // was flagged by Chrome as redundant with that required permission and
    // silently dropped — removing it changes nothing at runtime, just the
    // warning.
  },
});
