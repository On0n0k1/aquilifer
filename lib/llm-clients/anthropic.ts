// Raw-fetch client for the Anthropic-native provider type (SPEC §3). Called
// from the background service worker for real chat requests, and from the
// options page to verify a provider before saving it — never from the
// content script or injected script, which never see the credential.

import type { AquiliferChatParams } from '../aquilifer-protocol';
import type { AnthropicProvider } from '../providers';
import { describeError, type ChatResult } from './shared';

const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 1024;

export async function callAnthropic(
  provider: AnthropicProvider,
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
      // Anthropic requires this explicit acknowledgment for any request
      // carrying a browser-style Origin header (which every fetch() from an
      // extension context does, background service worker included) — the
      // sanctioned opt-in for calling the API directly from a browser
      // extension with the user's own key, rather than through a backend.
      'anthropic-dangerous-direct-browser-access': 'true',
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
    model?: string;
  };
  const text = (data.content ?? [])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('');

  return { text, model: data.model };
}
