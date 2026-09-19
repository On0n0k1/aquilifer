// Raw-fetch client for the generic OpenAI-compatible provider type (SPEC
// §3) — covers OpenAI itself, and self-hosted/local backends like llama.cpp,
// Ollama, LM Studio, vLLM. Called from the background service worker for
// real chat requests, and from the options page to verify a provider before
// saving it — never from the content script or injected script, which never
// see the credential.

import type { OpenAICompatibleProvider } from '../providers';
import type { AquiliferChatParams } from '../public-api';
import {
  type ChatResult,
  describeError,
  type ModelInfo,
  readSseDataLines,
} from './shared';

function requestHeaders(provider: Pick<OpenAICompatibleProvider, 'apiKey'>) {
  return {
    'content-type': 'application/json',
    ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}),
  };
}

export async function callOpenAICompatible(
  provider: OpenAICompatibleProvider,
  params: AquiliferChatParams,
): Promise<ChatResult> {
  const base = provider.baseUrl.replace(/\/+$/, '');

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(provider),
    body: JSON.stringify({
      model: provider.model,
      messages: params.messages,
    }),
  });

  if (!response.ok) throw new Error(await describeError(response));

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };

  return { text: data.choices?.[0]?.message?.content ?? '', model: data.model };
}

export async function streamOpenAICompatible(
  provider: OpenAICompatibleProvider,
  params: AquiliferChatParams,
  onDelta: (text: string) => void,
): Promise<void> {
  const base = provider.baseUrl.replace(/\/+$/, '');

  const response = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(provider),
    body: JSON.stringify({
      model: provider.model,
      messages: params.messages,
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(await describeError(response));
  if (!response.body) throw new Error('empty_stream_body');

  for await (const raw of readSseDataLines(response.body)) {
    if (raw === '[DONE]') break;

    let chunk: { choices?: { delta?: { content?: string } }[] };
    try {
      chunk = JSON.parse(raw);
    } catch {
      continue;
    }

    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) onDelta(delta);
  }
}

/**
 * Lists models available from this base URL (SPEC §3) — same role as
 * `listAnthropicModels`. Not every self-hosted OpenAI-compatible server
 * implements `/v1/models` (unlike a single well-known vendor's official
 * API), so callers need to treat a thrown error here as "unsupported,
 * fall back to asking the user for a model name," not as a connectivity
 * failure specifically.
 */
export async function listOpenAICompatibleModels(
  provider: Pick<OpenAICompatibleProvider, 'baseUrl' | 'apiKey'>,
): Promise<ModelInfo[]> {
  const base = provider.baseUrl.replace(/\/+$/, '');

  const response = await fetch(`${base}/v1/models`, {
    headers: requestHeaders(provider),
  });

  if (!response.ok) throw new Error(await describeError(response));

  const data = (await response.json()) as { data?: { id: string }[] };

  return (data.data ?? []).map((model) => ({ id: model.id, label: model.id }));
}
