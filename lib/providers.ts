// Provider/credential store (SPEC §3). Lives in plain chrome.storage.local
// (decided) and is only ever read by the background service worker when it
// makes the actual LLM fetch — never exposed to the page-facing protocol.

export type ProviderType = 'anthropic' | 'openai-compatible';

export interface AnthropicProvider {
  id: string;
  type: 'anthropic';
  label: string;
  apiKey: string;
  model: string;
}

export interface OpenAICompatibleProvider {
  id: string;
  type: 'openai-compatible';
  label: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export type ProviderConfig = AnthropicProvider | OpenAICompatibleProvider;

const PROVIDERS_KEY = 'providers';

export async function listProviders(): Promise<ProviderConfig[]> {
  const stored = await browser.storage.local.get(PROVIDERS_KEY);
  return (stored[PROVIDERS_KEY] as ProviderConfig[] | undefined) ?? [];
}

export async function saveProvider(provider: ProviderConfig): Promise<void> {
  const providers = await listProviders();
  const index = providers.findIndex((p) => p.id === provider.id);
  if (index >= 0) providers[index] = provider;
  else providers.push(provider);
  await browser.storage.local.set({ [PROVIDERS_KEY]: providers });
}

export async function deleteProvider(id: string): Promise<void> {
  const providers = await listProviders();
  await browser.storage.local.set({
    [PROVIDERS_KEY]: providers.filter((p) => p.id !== id),
  });
}

/**
 * A match pattern covering any port on the URL's scheme+host, for use with
 * `browser.permissions.request()`. Match patterns don't include a port
 * component, so `http://localhost/*` already covers `http://localhost:8080`.
 */
export function originPatternForUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported.');
  }
  return `${parsed.protocol}//${parsed.hostname}/*`;
}
