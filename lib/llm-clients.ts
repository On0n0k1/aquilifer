// Raw-fetch clients for both provider types (SPEC §3). Used only from the
// background service worker — this is where the credential gets attached.

import type { AquiliferChatParams } from './aquilifer-protocol';
import type { ProviderConfig } from './providers';

const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 1024;

export interface ChatResult {
  text: string;
}

export async function runChat(
  provider: ProviderConfig,
  params: AquiliferChatParams,
): Promise<ChatResult> {
  return provider.type === 'anthropic'
    ? callAnthropic(provider, params)
    : callOpenAICompatible(provider, params);
}

async function callAnthropic(
  provider: Extract<ProviderConfig, { type: 'anthropic' }>,
  params: AquiliferChatParams,
): Promise<ChatResult> {
  // The Messages API takes `system` separately from the `messages` array.
  const system = params.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const messages = params.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({ role: message.role, content: message.content }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: DEFAULT_MAX_TOKENS,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('');

  return { text };
}

async function callOpenAICompatible(
  provider: Extract<ProviderConfig, { type: 'openai-compatible' }>,
  params: AquiliferChatParams,
): Promise<ChatResult> {
  const base = provider.baseUrl.replace(/\/+$/, '');

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(provider.apiKey
        ? { authorization: `Bearer ${provider.apiKey}` }
        : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages: params.messages,
    }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return { text: data.choices?.[0]?.message?.content ?? '' };
}

async function describeError(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  return `provider_error_${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`;
}
