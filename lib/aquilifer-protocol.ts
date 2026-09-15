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
  AnthropicMessagesStreamEvent,
  OpenAIChatCompletionsRequest,
  OpenAIChatCompletionsStreamChunk,
} from './provider-interfaces';
// Public types (SPEC §5) imported back in from lib/public-api.ts only where
// an internal wire-protocol shape below needs to reference them — that file
// is the canonical source, this one never redefines or re-exports them.
import type {
  AquiliferChatParams,
  AquiliferGenericRequestPayload,
  AquiliferPageEvent,
} from './public-api';

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

export interface AquiliferEventContentMessage {
  source: typeof AQUILIFER_EVENT_CONTENT_SOURCE;
  event: AquiliferPageEvent;
}

// Provider-specific streaming (SPEC §5, §10) — `anthropicMessagesStream()`
// and `openaiChatCompletionsStream()`. Each gets its own dedicated Port,
// separate from the generic stream Port above and from each other, so a
// future breaking change to one interface's streaming shape can never
// ripple into another's channel.
export const AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PAGE_SOURCE =
  'aquilifer-anthropic-messages-stream-page';
export const AQUILIFER_ANTHROPIC_MESSAGES_STREAM_CONTENT_SOURCE =
  'aquilifer-anthropic-messages-stream-content';
export const AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PORT_NAME =
  'aquilifer-anthropic-messages-stream';

export const AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PAGE_SOURCE =
  'aquilifer-openai-chat-completions-stream-page';
export const AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_CONTENT_SOURCE =
  'aquilifer-openai-chat-completions-stream-content';
export const AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PORT_NAME =
  'aquilifer-openai-chat-completions-stream';

/** Shared shape for a provider-specific interface's streamed event,
 *  parameterized by that interface's own raw chunk/event type — Anthropic's
 *  and OpenAI's streaming shapes are structurally unrelated, so `chunk`
 *  carries the provider's own event object untouched rather than being
 *  simplified to `{ delta }` like the generic `stream()`, keeping friction
 *  at zero for a caller who already knows the real SDK's streaming shape. */
export type AquiliferProviderStreamEvent<TChunk> =
  | { type: 'chunk'; chunk: TChunk }
  | { type: 'done' }
  | { type: 'error'; error: string; code?: string };

export type AquiliferProviderStreamPortEvent<TChunk> =
  AquiliferProviderStreamEvent<TChunk> & { id: string };

/** What the content script sends over a provider stream's dedicated Port
 *  when starting it — no `method` needed, the Port is already stream- and
 *  interface-specific. */
export interface AquiliferProviderStreamPortRequest<TParams> {
  id: string;
  params: TParams;
}

export type AnthropicMessagesStreamEventPayload =
  AquiliferProviderStreamEvent<AnthropicMessagesStreamEvent>;
export type AnthropicMessagesStreamPortEvent =
  AquiliferProviderStreamPortEvent<AnthropicMessagesStreamEvent>;
export type AnthropicMessagesStreamPortRequest =
  AquiliferProviderStreamPortRequest<AnthropicMessagesRequest>;

export interface AnthropicMessagesStreamStartMessage {
  source: typeof AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PAGE_SOURCE;
  id: string;
  params: AnthropicMessagesRequest;
}

export interface AnthropicMessagesStreamEventMessage {
  source: typeof AQUILIFER_ANTHROPIC_MESSAGES_STREAM_CONTENT_SOURCE;
  id: string;
  event: AnthropicMessagesStreamEventPayload;
}

export type OpenAIChatCompletionsStreamEventPayload =
  AquiliferProviderStreamEvent<OpenAIChatCompletionsStreamChunk>;
export type OpenAIChatCompletionsStreamPortEvent =
  AquiliferProviderStreamPortEvent<OpenAIChatCompletionsStreamChunk>;
export type OpenAIChatCompletionsStreamPortRequest =
  AquiliferProviderStreamPortRequest<OpenAIChatCompletionsRequest>;

export interface OpenAIChatCompletionsStreamStartMessage {
  source: typeof AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PAGE_SOURCE;
  id: string;
  params: OpenAIChatCompletionsRequest;
}

export interface OpenAIChatCompletionsStreamEventMessage {
  source: typeof AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_CONTENT_SOURCE;
  id: string;
  event: OpenAIChatCompletionsStreamEventPayload;
}
