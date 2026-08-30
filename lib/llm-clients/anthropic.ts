// Raw-fetch client for the Anthropic-native provider type (SPEC §3). Used
// only from the background service worker — this is where the credential
// gets attached.

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
