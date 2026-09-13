import {
  AQUILIFER_CONTENT_SOURCE,
  AQUILIFER_PAGE_SOURCE,
  AQUILIFER_STREAM_CONTENT_SOURCE,
  AQUILIFER_STREAM_PAGE_SOURCE,
  type AquiliferChatParams,
  type AquiliferContentMessage,
  type AquiliferRequestPayload,
  type AquiliferStreamChunk,
  type AquiliferStreamEventMessage,
} from '../lib/aquilifer-protocol';
import { createAsyncStreamQueue } from '../lib/async-stream-queue';

declare global {
  interface Window {
    aquilifer?: {
      request: (payload: AquiliferRequestPayload) => Promise<unknown>;
      stream: (params: AquiliferChatParams) => AsyncIterable<AquiliferStreamChunk>;
    };
  }
}

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

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as
        | AquiliferContentMessage
        | AquiliferStreamEventMessage
        | undefined;
      if (!data) return;

      if (data.source === AQUILIFER_CONTENT_SOURCE) {
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);

        if (data.response.ok) entry.resolve(data.response.result);
        else entry.reject(new Error(data.response.error));
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
          queue.fail(new Error(data.event.error));
        }
      }
    });

    window.aquilifer = {
      request(payload) {
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          window.postMessage(
            { source: AQUILIFER_PAGE_SOURCE, id, payload },
            location.origin,
          );
        });
      },

      stream(params) {
        const id = crypto.randomUUID();
        const queue = createAsyncStreamQueue<AquiliferStreamChunk>();
        streams.set(id, queue);
        window.postMessage(
          { source: AQUILIFER_STREAM_PAGE_SOURCE, id, params },
          location.origin,
        );
        return queue;
      },
    };
  },
});
