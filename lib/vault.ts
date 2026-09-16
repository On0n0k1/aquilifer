// Encrypted vault for provider API keys (SPEC §6) — opt-in, never the
// default. Only a provider's `apiKey` is ever encrypted; `type`, `label`,
// `model`, `baseUrl`, and `id` all stay plaintext, since only a real LLM
// request ever needs the raw key — everything else (listing providers,
// the approval popup, `getProvider`) works the same whether the vault is
// locked or not.
//
// AES-GCM, key derived via PBKDF2 from a user password. The derived key is
// cached in `chrome.storage.session` once unlocked — an in-memory area
// scoped to the browser session, not any single execution context, so it
// survives a service-worker restart (which happens far more often than the
// browser actually closing) without needing to re-enter the password every
// ~30 seconds.

import { AQUILIFER_ERRORS } from './errors';
import { listProviders, setProviders } from './providers';

const VAULT_PREFIX = 'vault:v1:';
const SALT_STORAGE_KEY = 'vaultSalt';
const VERIFIER_STORAGE_KEY = 'vaultVerifier';
const SESSION_KEY_STORAGE_KEY = 'vaultSessionKey';
// Encrypted and checked against on unlock, to confirm the password derives
// the right key without ever decrypting a real credential to check it.
const VERIFIER_PLAINTEXT = 'aquilifer-vault-verifier';

// OWASP's 2023 minimum recommendation for PBKDF2-HMAC-SHA256.
const PBKDF2_ITERATIONS = 210_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Whether a stored `apiKey` string is a vault-encrypted envelope, as
 *  opposed to a plain, unencrypted key. */
export function isEncryptedApiKey(apiKey: string): boolean {
  return apiKey.startsWith(VAULT_PREFIX);
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    // Extractable, so the raw bytes can be cached in chrome.storage.session
    // (see cacheSessionKey below) — CryptoKey objects themselves can't be
    // stored, only structured-cloned between contexts of the same call.
    true,
    ['encrypt', 'decrypt'],
  );
}

async function encryptString(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${VAULT_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
}

async function decryptString(
  envelope: string,
  key: CryptoKey,
): Promise<string> {
  const [ivB64, ciphertextB64] = envelope.slice(VAULT_PREFIX.length).split(':');
  if (!ivB64 || !ciphertextB64) {
    throw new Error('Malformed vault envelope.');
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivB64) as BufferSource },
    key,
    base64ToBytes(ciphertextB64) as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

async function cacheSessionKey(key: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey('raw', key);
  await browser.storage.session.set({
    [SESSION_KEY_STORAGE_KEY]: bytesToBase64(new Uint8Array(raw)),
  });
}

async function getCachedKey(): Promise<CryptoKey | undefined> {
  const stored = await browser.storage.session.get(SESSION_KEY_STORAGE_KEY);
  const raw = stored[SESSION_KEY_STORAGE_KEY] as string | undefined;
  if (!raw) return undefined;
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(raw) as BufferSource,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt'],
  );
}

/** Whether the vault has ever been set up — independent of whether it's
 *  currently unlocked. */
export async function isVaultConfigured(): Promise<boolean> {
  const stored = await browser.storage.local.get(SALT_STORAGE_KEY);
  return Boolean(stored[SALT_STORAGE_KEY]);
}

/** Whether the vault is currently unlocked (a derived key is cached for
 *  this browser session). Always `false` if the vault was never set up. */
export async function isVaultUnlocked(): Promise<boolean> {
  return Boolean(await getCachedKey());
}

/**
 * Turns the vault on: derives a fresh key from `password`, re-encrypts
 * every existing provider's plaintext `apiKey` under it, and caches the
 * key for this browser session so it's immediately usable.
 */
export async function setUpVault(password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);

  const providers = await listProviders();
  for (const provider of providers) {
    if (provider.apiKey && !isEncryptedApiKey(provider.apiKey)) {
      provider.apiKey = await encryptString(provider.apiKey, key);
    }
  }
  await setProviders(providers);

  const verifier = await encryptString(VERIFIER_PLAINTEXT, key);
  await browser.storage.local.set({
    [SALT_STORAGE_KEY]: bytesToBase64(salt),
    [VERIFIER_STORAGE_KEY]: verifier,
  });
  await cacheSessionKey(key);
}

/**
 * Attempts to unlock with `password`. Returns whether it succeeded — a
 * wrong password fails cleanly (the verifier's AES-GCM auth tag won't
 * match), it never throws for that case.
 */
export async function unlockVault(password: string): Promise<boolean> {
  const stored = await browser.storage.local.get([
    SALT_STORAGE_KEY,
    VERIFIER_STORAGE_KEY,
  ]);
  const saltB64 = stored[SALT_STORAGE_KEY] as string | undefined;
  const verifier = stored[VERIFIER_STORAGE_KEY] as string | undefined;
  if (!saltB64 || !verifier) return false;

  const key = await deriveKey(password, base64ToBytes(saltB64));
  try {
    const decrypted = await decryptString(verifier, key);
    if (decrypted !== VERIFIER_PLAINTEXT) return false;
  } catch {
    return false;
  }

  await cacheSessionKey(key);
  return true;
}

/** Locks the vault immediately, without waiting for the browser to close —
 *  e.g. a "Lock now" action in Options after using a shared computer. */
export async function lockVault(): Promise<void> {
  await browser.storage.session.remove(SESSION_KEY_STORAGE_KEY);
}

/**
 * Turns the vault off: decrypts every provider's `apiKey` back to
 * plaintext and clears the vault's own storage. Requires the vault to
 * already be unlocked, since decrypting back needs the key.
 */
export async function disableVault(): Promise<void> {
  const key = await getCachedKey();
  if (!key) throw new Error(AQUILIFER_ERRORS.VAULT_LOCKED);

  const providers = await listProviders();
  for (const provider of providers) {
    if (provider.apiKey && isEncryptedApiKey(provider.apiKey)) {
      provider.apiKey = await decryptString(provider.apiKey, key);
    }
  }
  await setProviders(providers);

  await browser.storage.local.remove([SALT_STORAGE_KEY, VERIFIER_STORAGE_KEY]);
  await lockVault();
}

/**
 * Encrypts a freshly-entered `apiKey` for storage, if the vault is
 * configured. Requires the vault to already be unlocked — saving a new
 * provider's credential needs the key just as much as reading one does.
 */
export async function encryptApiKeyForStorage(apiKey: string): Promise<string> {
  if (!(await isVaultConfigured())) return apiKey;
  const key = await getCachedKey();
  if (!key) throw new Error(AQUILIFER_ERRORS.VAULT_LOCKED);
  return encryptString(apiKey, key);
}

/**
 * Decrypts a single stored `apiKey` if it's a vault envelope, or returns
 * it unchanged if it's already plaintext (vault never enabled, or this
 * particular provider predates it). Throws `vault_locked` if it's
 * encrypted but the vault isn't currently unlocked.
 */
export async function resolveApiKey(apiKey: string): Promise<string> {
  if (!isEncryptedApiKey(apiKey)) return apiKey;
  const key = await getCachedKey();
  if (!key) throw new Error(AQUILIFER_ERRORS.VAULT_LOCKED);
  return decryptString(apiKey, key);
}
