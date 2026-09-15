// Typed pass-through for the Anthropic-native provider-specific interface
// (SPEC §5). The website builds a request in Anthropic's own Messages API
// shape; this only overrides `model` (bound provider, never site-chosen,
// §4) and attaches the credential — everything else forwards as-is.
// Types come from `@anthropic-ai/sdk` via `import type` only — the SDK's
// runtime client is never used, so this costs nothing in the built bundle.

import type Anthropic from '@anthropic-ai/sdk';
import { AQUILIFER_ERRORS } from '../errors';
import type { AnthropicProvider } from '../providers';
import { describeError, readSseDataLines } from '../llm-clients/shared';

const ANTHROPIC_API_VERSION = '2023-06-01';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export type AnthropicMessagesRequest = Omit<
  Anthropic.MessageCreateParamsNonStreaming,
  'model' | 'stream'
>;
export type AnthropicMessagesResponse = Anthropic.Message;
/** The raw event shape Anthropic's own SDK yields from a streaming call —
 *  forwarded to the page as-is (SPEC §5), not simplified to `{ delta }`
 *  like the generic interface's `stream()`, so a caller already familiar
 *  with the real Messages API streaming shape gets zero-friction parity. */
export type AnthropicMessagesStreamEvent = Anthropic.MessageStreamEvent;

function requestHeaders(provider: AnthropicProvider) {
  return {
    'content-type': 'application/json',
    'x-api-key': provider.apiKey,
    'anthropic-version': ANTHROPIC_API_VERSION,
    // Same requirement as the generic client (lib/llm-clients/anthropic.ts)
    // — required for any request carrying a browser-style Origin header.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

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

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: requestHeaders(provider),
    body: JSON.stringify({ ...body, model: provider.model, stream: false }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  return (await response.json()) as AnthropicMessagesResponse;
}

export async function streamAnthropicMessages(
  provider: AnthropicProvider,
  body: AnthropicMessagesRequest,
  onEvent: (event: AnthropicMessagesStreamEvent) => void,
): Promise<void> {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: requestHeaders(provider),
    body: JSON.stringify({ ...body, model: provider.model, stream: true }),
  });

  if (!response.ok) throw new Error(await describeError(response));
  if (!response.body) throw new Error('empty_stream_body');

  for await (const raw of readSseDataLines(response.body)) {
    let event: { type: string; error?: unknown };
    try {
      event = JSON.parse(raw);
    } catch {
      continue;
    }
    // Anthropic sends mid-stream failures as an `error`-type SSE event
    // rather than a non-2xx HTTP status — surfaced as a real thrown error
    // (matching lib/llm-clients/anthropic.ts's generic streamer) so a
    // `for await` consumer's error handling doesn't have to special-case
    // one particular "chunk" that's actually a failure.
    if (event.type === 'error') {
      throw new Error(`provider_stream_error: ${JSON.stringify(event.error)}`);
    }
    onEvent(event as AnthropicMessagesStreamEvent);
  }
}
