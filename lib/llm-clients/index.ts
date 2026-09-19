import type { ProviderConfig } from '../providers';
import type { AquiliferChatParams } from '../public-api';
import {
  callAnthropic,
  listAnthropicModels,
  streamAnthropic,
} from './anthropic';
import {
  callOpenAICompatible,
  listOpenAICompatibleModels,
  streamOpenAICompatible,
} from './openai-compatible';

export type { ChatResult, ModelInfo } from './shared';

/** What's known about a provider before it's ever been saved (SPEC §3) —
 *  enough credentials to list models, but no `id`/`model` yet, since
 *  listing models successfully is what determines `model`. */
export type ProviderDraft =
  | { type: 'anthropic'; apiKey: string }
  | { type: 'openai-compatible'; baseUrl: string; apiKey?: string };

export async function listModels(provider: ProviderDraft) {
  return provider.type === 'anthropic'
    ? listAnthropicModels(provider)
    : listOpenAICompatibleModels(provider);
}

export async function runChat(
  provider: ProviderConfig,
  params: AquiliferChatParams,
) {
  return provider.type === 'anthropic'
    ? callAnthropic(provider, params)
    : callOpenAICompatible(provider, params);
}

export async function runChatStream(
  provider: ProviderConfig,
  params: AquiliferChatParams,
  onDelta: (text: string) => void,
): Promise<void> {
  return provider.type === 'anthropic'
    ? streamAnthropic(provider, params, onDelta)
    : streamOpenAICompatible(provider, params, onDelta);
}
