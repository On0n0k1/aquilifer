import {
  AQUILIFER_CONTENT_SOURCE,
  AQUILIFER_PAGE_SOURCE,
  type AquiliferContentMessage,
  type AquiliferRequestPayload,
} from '../lib/aquilifer-protocol';

declare global {
  interface Window {
    aquilifer?: {
      request: (payload: AquiliferRequestPayload) => Promise<unknown>;
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

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as AquiliferContentMessage | undefined;
      if (!data || data.source !== AQUILIFER_CONTENT_SOURCE) return;

      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);

      if (data.response.ok) entry.resolve(data.response.result);
      else entry.reject(new Error(data.response.error));
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
    };
  },
});
