import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { setupSidebarScrollSpy } from './sidebar-scroll-spy';
import './custom.css';

let cleanup: (() => void) | undefined;

function restartSidebarScrollSpy() {
  cleanup?.();
  // The sidebar's headings belong to whichever page just rendered — wait
  // a frame so its DOM (and, on navigation, the new page's headings) is
  // actually there before scanning it.
  requestAnimationFrame(() => {
    cleanup = setupSidebarScrollSpy();
  });
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return;
    restartSidebarScrollSpy();
    router.onAfterRouteChange = restartSidebarScrollSpy;
  },
} satisfies Theme;
