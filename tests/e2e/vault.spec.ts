// Proves the vault's unlock flow end-to-end in a real browser (SPEC §6) —
// specifically the part a unit test can't see: background detecting a
// vault-locked provider mid-request, opening the real unlock popup, and
// resuming the original call once it's answered. lib/vault.test.ts already
// covers the crypto itself in isolation.
import type { AnthropicProvider } from '../../lib/providers';
import { expect, test } from './extension';
import { FIXTURES, fulfillJson } from './fixtures';

const TEST_PROVIDER: AnthropicProvider = {
  id: 'e2e-vault-provider',
  type: 'anthropic',
  label: 'E2E Vault Provider',
  apiKey: 'sk-test-not-a-real-key',
  model: 'claude-e2e-test',
};

const VAULT_PASSWORD = 'correct horse battery staple';

test('a locked vault opens the unlock popup mid-request, then the original call resolves', async ({
  context,
  page,
  extensionId,
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

  // Connect and approve, exactly like the plumbing smoke test — this binds
  // the origin in background's live in-memory grants, which a direct
  // storage write can't do (it only loads once at service-worker startup).
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.aquilifer));
  const connectPromise = page.evaluate(() =>
    window.aquilifer!.request({ method: 'connect' }),
  );
  const approvePopup = await context.waitForEvent('page');
  await Promise.race([
    approvePopup.getByRole('button', { name: 'Approve' }).click(),
    approvePopup.waitForEvent('close'),
  ]);
  expect(await connectPromise).toEqual({ connected: true });

  // Enable the vault via the real Options UI, then lock it — setUpVault
  // leaves it unlocked immediately, and the whole point of this test is
  // the locked path.
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByRole('tab', { name: 'Security' }).click();
  await options.getByLabel('Password', { exact: true }).fill(VAULT_PASSWORD);
  await options.getByLabel('Confirm password').fill(VAULT_PASSWORD);
  await options.getByRole('button', { name: 'Enable vault' }).click();
  await options.getByRole('button', { name: 'Lock now' }).click();
  await expect(options.getByText('The vault is locked.')).toBeVisible();
  await options.close();

  // chat() now hits a vault-encrypted apiKey mid-request — background
  // should pause it and open the real unlock popup rather than failing.
  const chatPromise = page.evaluate(() =>
    window.aquilifer!.request({
      method: 'chat',
      params: { messages: [{ role: 'user', content: 'Hi' }] },
    }),
  );

  const unlockPopup = await context.waitForEvent('page');
  await unlockPopup.getByLabel('Password').fill(VAULT_PASSWORD);
  await Promise.race([
    unlockPopup.getByRole('button', { name: 'Unlock' }).click(),
    unlockPopup.waitForEvent('close'),
  ]);

  expect(await chatPromise).toEqual({ message: 'Hello from the fixture.' });
});
