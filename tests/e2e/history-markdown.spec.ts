// Proves History's markdown rendering in a real browser (SPEC §7) —
// specifically the part a jsdom/RTL component test can't see at all: CSS
// application. `.history-list > li` (the entry-card styling) must be a
// child combinator, not a descendant one — a markdown-rendered response
// can contain its own <li> elements (bullet/numbered lists), and a plain
// descendant selector would incorrectly style those as entry cards too
// (caught once, by actually looking at rendered output, not by reading
// the CSS).
import { expect, test } from './extension';

test("a markdown list inside a response doesn't inherit the entry-card style", async ({
  context,
  extensionId,
}) => {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker)
    serviceWorker = await context.waitForEvent('serviceworker');
  await serviceWorker.evaluate(() =>
    browser.storage.local.set({
      history: [
        {
          id: 'h1',
          origin: 'https://example.com',
          timestamp: Date.now(),
          providerId: 'p1',
          providerLabel: 'My Anthropic',
          messages: [{ role: 'user', content: 'hi' }],
          outcome: { ok: true, message: '- one\n- two' },
        },
      ],
    }),
  );

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByRole('tab', { name: 'History' }).click();

  const entryCard = page.locator('.history-list > li');
  const nestedItem = page.locator('.markdown-content li').first();
  await expect(nestedItem).toBeVisible();

  const [entryBg, nestedBg] = await Promise.all([
    entryCard.evaluate((el) => getComputedStyle(el).backgroundColor),
    nestedItem.evaluate((el) => getComputedStyle(el).backgroundColor),
  ]);

  // The entry card has an explicit parchment background; a bare <li>
  // inside markdown content should stay transparent, not inherit it.
  expect(nestedBg).not.toBe(entryBg);
  expect(nestedBg).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
});
