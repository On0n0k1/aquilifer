export const AQUILIFER_PAGE_SOURCE = 'aquilifer-page';
export const AQUILIFER_CONTENT_SOURCE = 'aquilifer-content';

// Streaming uses a separate, dedicated channel (a fresh Port per stream,
// opened by the content script) rather than the one-shot request/response
// relay above — the background needs to push multiple messages over time
// for a single logical call, which sendMessage/onMessage can't do.
export const AQUILIFER_STREAM_PAGE_SOURCE = 'aquilifer-stream-page';
export const AQUILIFER_STREAM_CONTENT_SOURCE = 'aquilifer-stream-content';
export const AQUILIFER_STREAM_PORT_NAME = 'aquilifer-stream';

// Page-facing events (SPEC §5) need the same kind of push-without-being-
// asked channel as streaming, but a different lifecycle: one Port per
// page, opened once at content-script load and kept open for as long as
// the page exists (reconnected if the background restarts), rather than a
// fresh Port per call.
export const AQUILIFER_EVENT_CONTENT_SOURCE = 'aquilifer-event-content';
export const AQUILIFER_EVENTS_PORT_NAME = 'aquilifer-events';

import type {
  AnthropicMessagesRequest,
  OpenAIChatCompletionsRequest,
} from './provider-interfaces';

export type AquiliferMethod =
  | 'connect'
  | 'disconnect'
  | 'chat'
  | 'getHistory'
  | 'getProvider'
  | 'isConnected'
  | 'anthropicMessages'
  | 'openaiChatCompletions';

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

/** The provider-specific interfaces (SPEC §5) — reached only through their
 *  own dedicated methods (`window.aquilifer.anthropicMessages`,
 *  `.openaiChatCompletions`), never through `request()`. Same wire
 *  protocol underneath (background dispatches on `method` either way), but
 *  kept out of `request()`'s type so the generic path stays simple. */
export type AquiliferNativeRequestPayload =
  | { method: 'anthropicMessages'; params: AnthropicMessagesRequest }
  | { method: 'openaiChatCompletions'; params: OpenAIChatCompletionsRequest };

export type AquiliferRequestPayload =
  | AquiliferGenericRequestPayload
  | AquiliferNativeRequestPayload;

export type AquiliferResponsePayload =
  | { ok: true; result: unknown }
  | { ok: false; error: string; code?: string };

export interface AquiliferPageMessage {
  source: typeof AQUILIFER_PAGE_SOURCE;
  id: string;
  payload: AquiliferRequestPayload;
}

export interface AquiliferContentMessage {
  source: typeof AQUILIFER_CONTENT_SOURCE;
  id: string;
  response: AquiliferResponsePayload;
}

/** What a website actually receives from each `for await` iteration of
 *  `window.aquilifer.stream(...)`. Small and extensible on purpose. */
export interface AquiliferStreamChunk {
  delta: string;
}

/** Internal wire event for one stream, sent background -> content -> page.
 *  Completion/failure use JS's own async-iterator semantics on the page
 *  side (the loop ends, or throws) rather than being data the site sees. */
export type AquiliferStreamEvent =
  | { type: 'chunk'; delta: string }
  | { type: 'done' }
  | { type: 'error'; error: string; code?: string };

export interface AquiliferStreamStartMessage {
  source: typeof AQUILIFER_STREAM_PAGE_SOURCE;
  id: string;
  params: AquiliferChatParams;
}

export interface AquiliferStreamEventMessage {
  source: typeof AQUILIFER_STREAM_CONTENT_SOURCE;
  id: string;
  event: AquiliferStreamEvent;
}

/** What the content script sends over the dedicated Port when starting a
 *  stream — no `method` needed, the port itself is already stream-only. */
export interface AquiliferStreamPortRequest {
  id: string;
  params: AquiliferChatParams;
}

export type AquiliferStreamPortEvent = AquiliferStreamEvent & { id: string };

/** Pushed background -> content -> page whenever an origin's connection
 *  state changes, without the page having asked. `connect` fires on a 0->1
 *  transition (fresh connect or switch-approval from unconnected);
 *  `permissionChanged` fires when an already-connected origin's binding
 *  changes (e.g. a switch to a different provider); `disconnect` fires on
 *  a 1->0 transition (explicit disconnect, or revoked from Options). The
 *  detail on `connect`/`permissionChanged` is the same shape `getProvider`
 *  returns, so a page doesn't need a follow-up call just to see what it's
 *  now bound to. */
export type AquiliferPageEvent =
  | { name: 'connect'; detail: AquiliferProviderInfo }
  | { name: 'permissionChanged'; detail: AquiliferProviderInfo }
  | { name: 'disconnect' };

export interface AquiliferEventContentMessage {
  source: typeof AQUILIFER_EVENT_CONTENT_SOURCE;
  event: AquiliferPageEvent;
}
