import type { AquiliferChatParams } from '../aquilifer-protocol';
import type { ProviderConfig } from '../providers';
import { callAnthropic } from './anthropic';
import { callOpenAICompatible } from './openai-compatible';

export type { ChatResult } from './shared';

export async function runChat(
  provider: ProviderConfig,
  params: AquiliferChatParams,
) {
  return provider.type === 'anthropic'
    ? callAnthropic(provider, params)
    : callOpenAICompatible(provider, params);
}
