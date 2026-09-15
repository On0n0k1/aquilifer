// Smoke test proving the cross-context plumbing works end-to-end (SPEC
// §11): page -> injected script -> content-script relay -> background ->
// approval popup -> background -> back to the page. Everything a unit test
// can't see, since it all happens across real separate browser surfaces.
import type { AnthropicProvider } from '../../lib/providers';
import { expect, test } from './fixtures';

const TEST_PROVIDER: AnthropicProvider = {
  id: 'e2e-test-provider',
  type: 'anthropic',
  label: 'E2E Test Provider',
  apiKey: 'sk-test-not-a-real-key',
  model: 'claude-e2e-test',
};

test('connect, approve, and chat() resolves with the mocked provider response', async ({
  context,
  page,
}) => {
  // Seed a provider directly via extension storage, bypassing the Options
  // UI — this scenario is about proving the connect/approve/chat plumbing,
  // not the provider-creation form (a separate concern for its own test).
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker');
  await serviceWorker.evaluate(
    (provider) => browser.storage.local.set({ providers: [provider] }),
    TEST_PROVIDER,
  );

  // Mock Anthropic's Messages API so the test never makes a real network
  // call or needs a real credential.
  await context.route('https://api.anthropic.com/v1/messages', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{ type: 'text', text: 'Hello from the mock.' }],
        model: 'claude-e2e-test-resolved',
      }),
    }),
  );

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.aquilifer));

  // connect() doesn't resolve until the popup is answered, so don't await
  // it yet — fire it, then handle the popup, then come back for the result.
  const connectPromise = page.evaluate(() =>
    window.aquilifer!.request({ method: 'connect' }),
  );

  const popup = await context.waitForEvent('page');
  // approve.html calls window.close() right after the click handler's async
  // work finishes — race against that instead of awaiting click() directly,
  // since the popup can close mid-action before Playwright considers the
  // click itself fully settled.
  await Promise.race([
    popup.getByRole('button', { name: 'Approve' }).click(),
    popup.waitForEvent('close'),
  ]);

  expect(await connectPromise).toEqual({ connected: true });

  const chatResult = await page.evaluate(() =>
    window.aquilifer!.request({
      method: 'chat',
      params: { messages: [{ role: 'user', content: 'Hi' }] },
    }),
  );

  expect(chatResult).toEqual({ message: 'Hello from the mock.' });
});
