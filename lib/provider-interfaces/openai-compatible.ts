// Typed pass-through for the OpenAI-compatible provider-specific interface
// (SPEC §5). Same treatment as the Anthropic one — model/credential
// overridden here, everything else forwards as-is. Types come from the
// `openai` package via `import type` only, no runtime SDK usage.

import type OpenAI from 'openai';
import { AQUILIFER_ERRORS } from '../errors';
import type { OpenAICompatibleProvider } from '../providers';
import { describeError } from '../llm-clients/shared';

export type OpenAIChatCompletionsRequest = Omit<
  OpenAI.ChatCompletionCreateParamsNonStreaming,
  'model' | 'stream'
>;
export type OpenAIChatCompletionsResponse = OpenAI.ChatCompletion;

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
    headers: {
      'content-type': 'application/json',
      ...(provider.apiKey
        ? { authorization: `Bearer ${provider.apiKey}` }
        : {}),
    },
    body: JSON.stringify({ ...body, model: provider.model, stream: false }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  return (await response.json()) as OpenAIChatCompletionsResponse;
}
