// Proves the block-alert cooldown (background.ts's handleBlocked) end to
// end — a site retrying immediately after being rate-limited hits the same
// blocked path on every call, and only a real service-worker timer/Map can
// show whether that still fires one OS notification per call (spammy) or
// is throttled. No unit test exists for background.ts (SPEC §11 tests it
// only at this tier), so this is the only place that gap would show up.
import type { AnthropicProvider } from '../../lib/providers';
import { expect, test } from './extension';
import { FIXTURES, fulfillJson } from './fixtures';

const TEST_PROVIDER: AnthropicProvider = {
  id: 'e2e-cooldown-provider',
  type: 'anthropic',
  label: 'E2E Cooldown Provider',
  apiKey: 'sk-test-not-a-real-key',
  model: 'claude-e2e-test',
};

test('repeated rate-limit blocks from one origin share a single alert cooldown', async ({
  context,
  page,
}) => {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker)
    serviceWorker = await context.waitForEvent('serviceworker');

  await serviceWorker.evaluate(
    (provider) => browser.storage.local.set({ providers: [provider] }),
    TEST_PROVIDER,
  );

  await context.route('https://api.anthropic.com/v1/messages', (route) =>
    fulfillJson(route, FIXTURES.ANTHROPIC_MESSAGES),
  );

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.aquilifer));

  // Real connect/approve handshake — resolveBoundProvider reads an
  // in-memory Map populated by this flow, not storage read fresh per
  // call, so seeding originGrants directly wouldn't actually bind it.
  const connectPromise = page.evaluate(() =>
    window.aquilifer!.request({ method: 'connect' }),
  );
  const popup = await context.waitForEvent('page');
  await Promise.race([
    popup.getByRole('button', { name: 'Approve' }).click(),
    popup.waitForEvent('close'),
  ]);
  await connectPromise;

  // Tight enough that the second call in this test is already blocked;
  // notifyOnBlock on, showPopupOnBlock off so this only has to watch one
  // side effect, not also fight a real popup window. getRateLimitSettings
  // reads storage fresh on every call, unlike the provider grant above.
  await serviceWorker.evaluate(() =>
    browser.storage.local.set({
      rateLimitSettings: {
        global: { threshold: 1, windowMinutes: 10 },
        perInterface: {
          generic: { threshold: 1, windowMinutes: 10 },
          anthropicMessages: { threshold: 1, windowMinutes: 10 },
          openaiChatCompletions: { threshold: 1, windowMinutes: 10 },
        },
        sizeThresholdChars: 8000,
        notifyOnBlock: true,
        showPopupOnBlock: false,
      },
    }),
  );

  // Counts real calls instead of letting notifications actually pop up
  // during the run.
  await serviceWorker.evaluate(() => {
    (self as typeof self & { __notifyCallCount: number }).__notifyCallCount = 0;
    const original = browser.notifications.create.bind(browser.notifications);
    browser.notifications.create = ((...args: Parameters<typeof original>) => {
      (self as typeof self & { __notifyCallCount: number }).__notifyCallCount++;
      return original(...args);
    }) as typeof browser.notifications.create;
  });

  async function chat() {
    return page.evaluate(() =>
      window
        .aquilifer!.request({
          method: 'chat',
          params: { messages: [{ role: 'user', content: 'hi' }] },
        })
        .catch((error: unknown) => error),
    );
  }

  await chat(); // consumes the threshold-1 budget
  for (let i = 0; i < 5; i++) {
    await chat(); // every one of these is blocked
  }

  const notifyCallCount = await serviceWorker.evaluate(
    () =>
      (self as typeof self & { __notifyCallCount: number }).__notifyCallCount,
  );
  expect(notifyCallCount).toBe(1);
});
