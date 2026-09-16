import { beforeEach, describe, expect, it } from 'vitest';
import type { AnthropicProvider } from './providers';
import { listProviders, saveProvider } from './providers';
import {
  disableVault,
  encryptApiKeyForStorage,
  isEncryptedApiKey,
  isVaultConfigured,
  isVaultUnlocked,
  lockVault,
  resolveApiKey,
  setUpVault,
  unlockVault,
} from './vault';

const PASSWORD = 'correct horse battery staple';

async function seedProvider(apiKey: string): Promise<AnthropicProvider> {
  const provider: AnthropicProvider = {
    id: 'p1',
    type: 'anthropic',
    label: 'Test',
    apiKey,
    model: 'claude-test',
  };
  await saveProvider(provider);
  return provider;
}

describe('before the vault is ever set up', () => {
  it('reports unconfigured and locked, and never touches a plaintext key', async () => {
    expect(await isVaultConfigured()).toBe(false);
    expect(await isVaultUnlocked()).toBe(false);
    expect(isEncryptedApiKey('sk-plain')).toBe(false);
    expect(await resolveApiKey('sk-plain')).toBe('sk-plain');
    expect(await encryptApiKeyForStorage('sk-plain')).toBe('sk-plain');
  });
});

describe('setUpVault', () => {
  it('configures and unlocks the vault, and re-encrypts existing providers', async () => {
    const provider = await seedProvider('sk-real-key');

    await setUpVault(PASSWORD);

    expect(await isVaultConfigured()).toBe(true);
    expect(await isVaultUnlocked()).toBe(true);

    const [stored] = await listProviders();
    expect(stored?.apiKey).not.toBe(provider.apiKey);
    expect(isEncryptedApiKey(stored?.apiKey ?? '')).toBe(true);
    expect(await resolveApiKey(stored?.apiKey ?? '')).toBe('sk-real-key');
  });

  it('encrypts a freshly-saved key the same way', async () => {
    await setUpVault(PASSWORD);

    const encrypted = await encryptApiKeyForStorage('sk-fresh');
    expect(isEncryptedApiKey(encrypted)).toBe(true);
    expect(await resolveApiKey(encrypted)).toBe('sk-fresh');
  });
});

describe('lock and unlock', () => {
  beforeEach(async () => {
    await seedProvider('sk-real-key');
    await setUpVault(PASSWORD);
  });

  it('locking clears the cached key; the encrypted key becomes unreadable until unlocked again', async () => {
    const [stored] = await listProviders();
    const encrypted = stored?.apiKey ?? '';

    await lockVault();
    expect(await isVaultUnlocked()).toBe(false);
    await expect(resolveApiKey(encrypted)).rejects.toThrow('vault_locked');
    await expect(encryptApiKeyForStorage('sk-new')).rejects.toThrow(
      'vault_locked',
    );

    expect(await unlockVault(PASSWORD)).toBe(true);
    expect(await isVaultUnlocked()).toBe(true);
    expect(await resolveApiKey(encrypted)).toBe('sk-real-key');
  });

  it('rejects the wrong password without throwing', async () => {
    await lockVault();
    expect(await unlockVault('not the password')).toBe(false);
    expect(await isVaultUnlocked()).toBe(false);
  });
});

describe('disableVault', () => {
  it('decrypts every provider back to plaintext and clears vault state', async () => {
    await seedProvider('sk-real-key');
    await setUpVault(PASSWORD);

    await disableVault();

    expect(await isVaultConfigured()).toBe(false);
    expect(await isVaultUnlocked()).toBe(false);
    const [stored] = await listProviders();
    expect(stored?.apiKey).toBe('sk-real-key');
    expect(isEncryptedApiKey(stored?.apiKey ?? '')).toBe(false);
  });

  it('refuses to run while locked, since decrypting back needs the key', async () => {
    await seedProvider('sk-real-key');
    await setUpVault(PASSWORD);
    await lockVault();

    await expect(disableVault()).rejects.toThrow('vault_locked');
  });
});
