import type { AquiliferChatParams } from '../aquilifer-protocol';
import type { ProviderConfig } from '../providers';
import { callAnthropic, streamAnthropic } from './anthropic';
import { callOpenAICompatible, streamOpenAICompatible } from './openai-compatible';

export type { ChatResult } from './shared';

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
