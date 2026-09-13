export const AQUILIFER_PAGE_SOURCE = 'aquilifer-page';
export const AQUILIFER_CONTENT_SOURCE = 'aquilifer-content';

// Streaming uses a separate, dedicated channel (a fresh Port per stream,
// opened by the content script) rather than the one-shot request/response
// relay above — the background needs to push multiple messages over time
// for a single logical call, which sendMessage/onMessage can't do.
export const AQUILIFER_STREAM_PAGE_SOURCE = 'aquilifer-stream-page';
export const AQUILIFER_STREAM_CONTENT_SOURCE = 'aquilifer-stream-content';
export const AQUILIFER_STREAM_PORT_NAME = 'aquilifer-stream';

export type AquiliferMethod =
  | 'connect'
  | 'disconnect'
  | 'chat'
  | 'getHistory'
  | 'getProvider';

export interface AquiliferChatParams {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

/** Result shape for `getProvider` — visibility only, never a credential,
 *  the freeform `label`, `baseUrl`, or the provider's internal `id`. */
export interface AquiliferProviderInfo {
  type: 'anthropic' | 'openai-compatible';
  model: string;
}

export interface AquiliferRequestPayload {
  method: AquiliferMethod;
  params?: AquiliferChatParams;
}

export type AquiliferResponsePayload =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

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
  | { type: 'error'; error: string };

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
