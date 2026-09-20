// VitePress's own scroll-spy (useActiveAnchor) only highlights the
// right-side "On this page" outline as you scroll — it manipulates that
// component's own DOM subtree directly and never touches the left
// sidebar, even for sidebar items that point at in-page anchors (like the
// nested "For developers" items in config.ts). This re-implements the
// same "last heading above the viewport" logic, scoped to the left
// sidebar's own anchor links instead.

const ACTIVE_CLASS = 'sidebar-scroll-active';

export function setupSidebarScrollSpy(): () => void {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.VPSidebar a.link'),
  ).filter((link) => link.getAttribute('href')?.includes('#'));

  const targets = links
    .map((link) => {
      const hash = link.getAttribute('href')?.split('#')[1];
      const heading = hash
        ? document.getElementById(decodeURIComponent(hash))
        : null;
      return heading ? { link, heading } : null;
    })
    .filter(
      (entry): entry is { link: HTMLAnchorElement; heading: HTMLElement } =>
        entry !== null,
    )
    // Document order, not sidebar-authoring order — the "last heading
    // above the viewport" scan below depends on it.
    .sort((a, b) => {
      const position = a.heading.compareDocumentPosition(b.heading);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

  if (targets.length === 0) return () => {};

  let current: HTMLAnchorElement | null = null;

  function update() {
    // At the bottom of the page, force the last section active — nothing
    // can ever scroll its heading far enough past the offset to "win" the
    // scan below otherwise (same fix VitePress's own outline scroll-spy
    // applies for the same reason).
    const atBottom =
      Math.abs(
        window.scrollY + window.innerHeight - document.body.offsetHeight,
      ) < 1;
    if (atBottom) {
      activate(targets[targets.length - 1]!.link);
      return;
    }

    // Same viewport-offset margin VitePress's own outline scroll-spy uses
    // (see node_modules/vitepress .../composables/outline.js), so the two
    // stay in sync with each other while scrolling the API page.
    const offset = 4;
    let active: HTMLAnchorElement | null = null;
    for (const { link, heading } of targets) {
      if (heading.getBoundingClientRect().top - offset > 0) break;
      active = link;
    }
    activate(active);
  }

  function activate(active: HTMLAnchorElement | null) {
    if (active === current) return;
    current?.classList.remove(ACTIVE_CLASS);
    active?.classList.add(ACTIVE_CLASS);
    current = active;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    current?.classList.remove(ACTIVE_CLASS);
  };
}
