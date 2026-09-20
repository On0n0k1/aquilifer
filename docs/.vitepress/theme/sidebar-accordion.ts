// VitePress's own sidebar (composables/sidebar.js, useSidebarControl)
// auto-expands a collapsed: true group when you visit a page inside it,
// but never re-collapses it once you navigate away — every group you've
// ever visited just stays open. There's no config flag for true
// accordion behavior, so this closes every *other* group by clicking its
// own caret (the only thing that actually flips VitePress's internal
// per-item collapsed state — nothing outside the component can set it
// directly).

export function collapseInactiveSidebarGroups(): void {
  const groups = document.querySelectorAll<HTMLElement>(
    '.VPSidebar .VPSidebarItem.level-1.collapsible',
  );

  for (const group of groups) {
    const isExpanded = !group.classList.contains('collapsed');
    const isCurrentPageGroup =
      group.classList.contains('is-active') ||
      group.classList.contains('has-active');
    if (!isExpanded || isCurrentPageGroup) continue;

    group.querySelector<HTMLElement>(':scope > .item > .caret')?.click();
  }
}
