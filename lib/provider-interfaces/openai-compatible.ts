// Typed pass-through for the OpenAI-compatible provider-specific interface
// (SPEC §5). Same treatment as the Anthropic one — model/credential
// overridden here, everything else forwards as-is. Types come from the
// `openai` package via `import type` only, no runtime SDK usage.

import type OpenAI from 'openai';
import { AQUILIFER_ERRORS } from '../errors';
import type { OpenAICompatibleProvider } from '../providers';
import { describeError, readSseDataLines } from '../llm-clients/shared';

export type OpenAIChatCompletionsRequest = Omit<
  OpenAI.ChatCompletionCreateParamsNonStreaming,
  'model' | 'stream'
>;
export type OpenAIChatCompletionsResponse = OpenAI.ChatCompletion;
/** The raw chunk shape OpenAI's own SDK yields from a streaming call —
 *  forwarded to the page as-is (SPEC §5), not simplified to `{ delta }`
 *  like the generic interface's `stream()`, so a caller already familiar
 *  with the real chat-completions streaming shape gets zero-friction
 *  parity. */
export type OpenAIChatCompletionsStreamChunk = OpenAI.ChatCompletionChunk;

function requestHeaders(provider: OpenAICompatibleProvider) {
  return {
    'content-type': 'application/json',
    ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}),
  };
}

export async function callOpenAIChatCompletions(
  provider: OpenAICompatibleProvider,
  body: OpenAIChatCompletionsRequest,
): Promise<OpenAIChatCompletionsResponse> {
  if ((body as { stream?: unknown }).stream) {
    throw new Error(AQUILIFER_ERRORS.STREAMING_NOT_SUPPORTED);
  }

  const base = provider.baseUrl.replace(/\/+$/, '');

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(provider),
    body: JSON.stringify({ ...body, model: provider.model, stream: false }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  return (await response.json()) as OpenAIChatCompletionsResponse;
}

export async function streamOpenAIChatCompletions(
  provider: OpenAICompatibleProvider,
  body: OpenAIChatCompletionsRequest,
  onChunk: (chunk: OpenAIChatCompletionsStreamChunk) => void,
): Promise<void> {
  const base = provider.baseUrl.replace(/\/+$/, '');

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(provider),
    body: JSON.stringify({ ...body, model: provider.model, stream: true }),
  });

  if (!response.ok) throw new Error(await describeError(response));
  if (!response.body) throw new Error('empty_stream_body');

  for await (const raw of readSseDataLines(response.body)) {
    if (raw === '[DONE]') break;

    let chunk: OpenAIChatCompletionsStreamChunk;
    try {
      chunk = JSON.parse(raw);
    } catch {
      continue;
    }
    onChunk(chunk);
  }
}
