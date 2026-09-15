// Typed pass-through for the Anthropic-native provider-specific interface
// (SPEC §5). The website builds a request in Anthropic's own Messages API
// shape; this only overrides `model` (bound provider, never site-chosen,
// §4) and attaches the credential — everything else forwards as-is.
// Types come from `@anthropic-ai/sdk` via `import type` only — the SDK's
// runtime client is never used, so this costs nothing in the built bundle.

import type Anthropic from '@anthropic-ai/sdk';
import { AQUILIFER_ERRORS } from '../errors';
import type { AnthropicProvider } from '../providers';
import { describeError } from '../llm-clients/shared';

const ANTHROPIC_API_VERSION = '2023-06-01';

export type AnthropicMessagesRequest = Omit<
  Anthropic.MessageCreateParamsNonStreaming,
  'model' | 'stream'
>;
export type AnthropicMessagesResponse = Anthropic.Message;

export async function callAnthropicMessages(
  provider: AnthropicProvider,
  body: AnthropicMessagesRequest,
): Promise<AnthropicMessagesResponse> {
  // The type already omits `stream`, but the actual wire format crossing
  // postMessage/sendMessage is untyped JSON — a caller ignoring our types
  // could still send it, so this is a real runtime guard, not a formality.
  if ((body as { stream?: unknown }).stream) {
    throw new Error(AQUILIFER_ERRORS.STREAMING_NOT_SUPPORTED);
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
      // Same requirement as the generic client (lib/llm-clients/anthropic.ts)
      // — required for any request carrying a browser-style Origin header.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ ...body, model: provider.model, stream: false }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  return (await response.json()) as AnthropicMessagesResponse;
}
