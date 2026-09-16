import {
  type AnthropicMessagesStreamEventMessage,
  AQUILIFER_ANTHROPIC_MESSAGES_STREAM_CONTENT_SOURCE,
  AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PAGE_SOURCE,
  AQUILIFER_CONTENT_SOURCE,
  AQUILIFER_EVENT_CONTENT_SOURCE,
  AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_CONTENT_SOURCE,
  AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PAGE_SOURCE,
  AQUILIFER_PAGE_SOURCE,
  AQUILIFER_STREAM_CONTENT_SOURCE,
  AQUILIFER_STREAM_PAGE_SOURCE,
  type AquiliferContentMessage,
  type AquiliferEventContentMessage,
  type AquiliferRequestPayload,
  type AquiliferStreamEventMessage,
  type OpenAIChatCompletionsStreamEventMessage,
} from '../lib/aquilifer-protocol';
import { createAsyncStreamQueue } from '../lib/async-stream-queue';
import type {
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
  AnthropicMessagesStreamEvent,
  OpenAIChatCompletionsRequest,
  OpenAIChatCompletionsResponse,
  OpenAIChatCompletionsStreamChunk,
} from '../lib/provider-interfaces';
import type {
  AquiliferChatParams,
  AquiliferError,
  AquiliferGenericRequestPayload,
  AquiliferPageEvent,
  AquiliferStreamChunk,
} from '../lib/public-api';

export default defineContentScript({
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    const pending = new Map<
      string,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
    const streams = new Map<
      string,
      ReturnType<typeof createAsyncStreamQueue<AquiliferStreamChunk>>
    >();
    const anthropicMessagesStreams = new Map<
      string,
      ReturnType<typeof createAsyncStreamQueue<AnthropicMessagesStreamEvent>>
    >();
    const openaiChatCompletionsStreams = new Map<
      string,
      ReturnType<
        typeof createAsyncStreamQueue<OpenAIChatCompletionsStreamChunk>
      >
    >();
    const events = new EventTarget();

    function sendRequest(payload: AquiliferRequestPayload): Promise<unknown> {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.postMessage(
          { source: AQUILIFER_PAGE_SOURCE, id, payload },
          location.origin,
        );
      });
    }

    function dispatchPageEvent(pageEvent: AquiliferPageEvent) {
      events.dispatchEvent(
        'detail' in pageEvent
          ? new CustomEvent(pageEvent.name, { detail: pageEvent.detail })
          : new CustomEvent(pageEvent.name),
      );
    }

    /** Shared by both provider-specific streams — same chunk/done/error
     *  routing as the generic stream case below, just against whichever
     *  queue map the caller passes (each interface's `id`s never collide,
     *  but its queue holds a different chunk type, §10). */
    function routeProviderStreamMessage<T>(
      queues: Map<string, ReturnType<typeof createAsyncStreamQueue<T>>>,
      data:
        | AnthropicMessagesStreamEventMessage
        | OpenAIChatCompletionsStreamEventMessage,
    ) {
      const queue = queues.get(data.id);
      if (!queue) return;

      if (data.event.type === 'chunk') {
        queue.push(data.event.chunk as T);
      } else if (data.event.type === 'done') {
        queues.delete(data.id);
        queue.close();
      } else {
        queues.delete(data.id);
        const error: AquiliferError = new Error(data.event.error);
        if (data.event.code) error.code = data.event.code;
        queue.fail(error);
      }
    }

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as
        | AquiliferContentMessage
        | AquiliferStreamEventMessage
        | AquiliferEventContentMessage
        | AnthropicMessagesStreamEventMessage
        | OpenAIChatCompletionsStreamEventMessage
        | undefined;
      if (!data) return;

      if (data.source === AQUILIFER_CONTENT_SOURCE) {
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);

        if (data.response.ok) {
          entry.resolve(data.response.result);
        } else {
          const error: AquiliferError = new Error(data.response.error);
          if (data.response.code) error.code = data.response.code;
          entry.reject(error);
        }
        return;
      }

      if (data.source === AQUILIFER_STREAM_CONTENT_SOURCE) {
        const queue = streams.get(data.id);
        if (!queue) return;

        if (data.event.type === 'chunk') {
          queue.push({ delta: data.event.delta });
        } else if (data.event.type === 'done') {
          streams.delete(data.id);
          queue.close();
        } else {
          streams.delete(data.id);
          const error: AquiliferError = new Error(data.event.error);
          if (data.event.code) error.code = data.event.code;
          queue.fail(error);
        }
        return;
      }

      if (data.source === AQUILIFER_EVENT_CONTENT_SOURCE) {
        dispatchPageEvent(data.event);
        return;
      }

      if (data.source === AQUILIFER_ANTHROPIC_MESSAGES_STREAM_CONTENT_SOURCE) {
        routeProviderStreamMessage(anthropicMessagesStreams, data);
        return;
      }

      if (
        data.source === AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_CONTENT_SOURCE
      ) {
        routeProviderStreamMessage(openaiChatCompletionsStreams, data);
      }
    });

    window.aquilifer = Object.assign(events, {
      request(payload: AquiliferGenericRequestPayload) {
        return sendRequest(payload);
      },

      stream(params: AquiliferChatParams) {
        const id = crypto.randomUUID();
        const queue = createAsyncStreamQueue<AquiliferStreamChunk>();
        streams.set(id, queue);
        window.postMessage(
          { source: AQUILIFER_STREAM_PAGE_SOURCE, id, params },
          location.origin,
        );
        return queue;
      },

      anthropicMessages(body: AnthropicMessagesRequest) {
        return sendRequest({
          method: 'anthropicMessages',
          params: body,
        }) as Promise<AnthropicMessagesResponse>;
      },

      openaiChatCompletions(body: OpenAIChatCompletionsRequest) {
        return sendRequest({
          method: 'openaiChatCompletions',
          params: body,
        }) as Promise<OpenAIChatCompletionsResponse>;
      },

      anthropicMessagesStream(body: AnthropicMessagesRequest) {
        const id = crypto.randomUUID();
        const queue = createAsyncStreamQueue<AnthropicMessagesStreamEvent>();
        anthropicMessagesStreams.set(id, queue);
        window.postMessage(
          {
            source: AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PAGE_SOURCE,
            id,
            params: body,
          },
          location.origin,
        );
        return queue;
      },

      openaiChatCompletionsStream(body: OpenAIChatCompletionsRequest) {
        const id = crypto.randomUUID();
        const queue =
          createAsyncStreamQueue<OpenAIChatCompletionsStreamChunk>();
        openaiChatCompletionsStreams.set(id, queue);
        window.postMessage(
          {
            source: AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PAGE_SOURCE,
            id,
            params: body,
          },
          location.origin,
        );
        return queue;
      },
    });
  },
});
