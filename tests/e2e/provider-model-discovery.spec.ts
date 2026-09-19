// Proves the Anthropic add-provider model-discovery flow end-to-end (SPEC
// §3) — the part a unit test can't see: the real Options form driving a
// mocked /v1/models call and auto-picking the first model on success.
//
// The openai-compatible path (and the discovery-fails-falls-back-to-manual
// branch) isn't covered here: it needs browser.permissions.request() for a
// new host, which pops a real native Chrome dialog that only resolves on
// an actual human click — confirmed by hand, not something Playwright can
// drive unattended. That branch is covered instead as a component test
// (ProvidersSection.test.tsx), which mocks browser.permissions.request()
// directly rather than hitting real browser chrome. Anthropic's origin
// skips this entirely — it's a fixed host_permission, never requested at
// runtime.
import { expect, test } from './extension';

test('discovery succeeds: auto-picks the first model, no manual field shown', async ({
  context,
  extensionId,
}) => {
  await context.route('https://api.anthropic.com/v1/models', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'claude-opus-5', display_name: 'Claude Opus 5' },
          { id: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' },
        ],
      }),
    }),
  );

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  expect(await page.getByLabel('Model').count()).toBe(0);

  await page.getByLabel('Label').fill('My Anthropic');
  await page.getByLabel('API key').fill('sk-test-not-real');
  await page.getByRole('button', { name: 'Connect' }).click();

  await expect(page.getByText('My Anthropic')).toBeVisible();
  await expect(page.getByText('claude-opus-5')).toBeVisible();
});
