import {
  AQUILIFER_CONTENT_SOURCE,
  AQUILIFER_PAGE_SOURCE,
  type AquiliferPageMessage,
  type AquiliferResponsePayload,
} from '../lib/aquilifer-protocol';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    window.addEventListener('message', async (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as AquiliferPageMessage | undefined;
      if (!data || data.source !== AQUILIFER_PAGE_SOURCE) return;

      let response: AquiliferResponsePayload;
      try {
        response = await browser.runtime.sendMessage(data.payload);
      } catch (error) {
        response = {
          ok: false,
          error: error instanceof Error ? error.message : 'relay_error',
        };
      }

      window.postMessage(
        { source: AQUILIFER_CONTENT_SOURCE, id: data.id, response },
        location.origin,
      );
    });
  },
});
