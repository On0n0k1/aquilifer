import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
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
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return;
    onRouteSettled();
    router.onAfterRouteChange = onRouteSettled;
  },
} satisfies Theme;
