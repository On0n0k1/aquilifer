// The public, website-facing surface of Aquilifer (SPEC §5) — everything a
// site author needs to know to use `window.aquilifer`, and nothing else.
// Deliberately decoupled from internal wire-protocol plumbing (Port names,
// message envelopes, background dispatch — all of that stays in
// `lib/aquilifer-protocol.ts`), so this file can double as the
// implementation-detail-free reference to write docs from, or later publish
// as a companion npm package's type declarations (§9, §10).

import type {
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
  AnthropicMessagesStreamEvent,
  OpenAIChatCompletionsRequest,
  OpenAIChatCompletionsResponse,
  OpenAIChatCompletionsStreamChunk,
} from './provider-interfaces';

export interface AquiliferChatParams {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

/** Result shape for `getProvider` — visibility only, never a credential,
 *  the freeform `label`, `baseUrl`, or the provider's internal `id`. */
export interface AquiliferProviderInfo {
  type: 'anthropic' | 'openai-compatible';
  model: string;
}

/** What `window.aquilifer.request()` accepts — the generic, provider-
 *  agnostic surface. Someone who just wants "ask the LLM something" never
 *  needs to see anything beyond this. */
export type AquiliferGenericRequestPayload =
  | { method: 'connect' | 'disconnect' | 'getHistory' | 'getProvider' | 'isConnected' }
  | { method: 'chat'; params: AquiliferChatParams };

/** What a website actually receives from each `for await` iteration of
 *  `window.aquilifer.stream(...)`. Small and extensible on purpose. */
export interface AquiliferStreamChunk {
  delta: string;
}

/** Pushed to the page whenever an origin's connection state changes,
 *  without the page having asked. `connect` fires on a 0->1 transition
 *  (fresh connect or switch-approval from unconnected); `permissionChanged`
 *  fires when an already-connected origin's binding changes (e.g. a switch
 *  to a different provider); `disconnect` fires on a 1->0 transition
 *  (explicit disconnect, or revoked from Options). The detail on
 *  `connect`/`permissionChanged` is the same shape `getProvider` returns,
 *  so a page doesn't need a follow-up call just to see what it's now bound
 *  to. */
export type AquiliferPageEvent =
  | { name: 'connect'; detail: AquiliferProviderInfo }
  | { name: 'permissionChanged'; detail: AquiliferProviderInfo }
  | { name: 'disconnect' };

/** Thrown for a failed `request()`/`stream()`/provider-specific call —
 *  `code` is only set for the stable identifiers documented in SPEC §5's
 *  error table; everything else is `.message` only. */
export interface AquiliferError extends Error {
  code?: string;
}

declare global {
  interface Window {
    /**
     * An `EventTarget` — subscribe to connection changes the normal way:
     * `window.aquilifer.addEventListener('disconnect', () => {...})`.
     * Events: `connect`, `disconnect`, `permissionChanged` (SPEC §5); the
     * first two carry `event.detail` shaped like `getProvider()`'s result.
     */
    aquilifer?: EventTarget & {
      request: (payload: AquiliferGenericRequestPayload) => Promise<unknown>;
      stream: (params: AquiliferChatParams) => AsyncIterable<AquiliferStreamChunk>;
      anthropicMessages: (
        body: AnthropicMessagesRequest,
      ) => Promise<AnthropicMessagesResponse>;
      openaiChatCompletions: (
        body: OpenAIChatCompletionsRequest,
      ) => Promise<OpenAIChatCompletionsResponse>;
      anthropicMessagesStream: (
        body: AnthropicMessagesRequest,
      ) => AsyncIterable<AnthropicMessagesStreamEvent>;
      openaiChatCompletionsStream: (
        body: OpenAIChatCompletionsRequest,
      ) => AsyncIterable<OpenAIChatCompletionsStreamChunk>;
    };
  }
}
