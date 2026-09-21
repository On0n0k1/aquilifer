import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import LastUpdatedTop from './LastUpdatedTop.vue';
import { collapseInactiveSidebarGroups } from './sidebar-accordion';
import { setupSidebarScrollSpy } from './sidebar-scroll-spy';
import './custom.css';

let cleanup: (() => void) | undefined;

function onRouteSettled() {
  cleanup?.();
  // The sidebar's headings belong to whichever page just rendered — wait
  // a frame so its DOM (and, on navigation, the new page's headings) is
  // actually there before scanning it.
  requestAnimationFrame(() => {
    // VitePress's own reactivity has already expanded the new page's
    // group by this point (it doesn't wait a frame to do that), so this
    // only ever closes groups that aren't the current page's.
    collapseInactiveSidebarGroups();
    cleanup = setupSidebarScrollSpy();
  });
}

export default {
  extends: DefaultTheme,
  // Renders right before the page's own compiled markdown content (so
  // above the H1, like a dateline above a headline) — the bottom copy
  // VitePress renders by default is hidden via custom.css, not disabled
  // at the config level, since disabling it there would drop the
  // underlying computed date entirely, not just its default position.
  Layout: () =>
    h(DefaultTheme.Layout, null, { 'doc-before': () => h(LastUpdatedTop) }),
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return;
    onRouteSettled();
    router.onAfterRouteChange = onRouteSettled;
  },
} satisfies Theme;
