import {
  AQUILIFER_ANTHROPIC_MESSAGES_STREAM_CONTENT_SOURCE,
  AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PAGE_SOURCE,
  AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PORT_NAME,
  AQUILIFER_CONTENT_SOURCE,
  AQUILIFER_EVENTS_PORT_NAME,
  AQUILIFER_EVENT_CONTENT_SOURCE,
  AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_CONTENT_SOURCE,
  AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PAGE_SOURCE,
  AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PORT_NAME,
  AQUILIFER_PAGE_SOURCE,
  AQUILIFER_STREAM_CONTENT_SOURCE,
  AQUILIFER_STREAM_PAGE_SOURCE,
  AQUILIFER_STREAM_PORT_NAME,
  type AnthropicMessagesStreamStartMessage,
  type AquiliferPageMessage,
  type AquiliferProviderStreamEvent,
  type AquiliferResponsePayload,
  type AquiliferStreamEvent,
  type AquiliferStreamPortEvent,
  type AquiliferStreamPortRequest,
  type AquiliferStreamStartMessage,
  type OpenAIChatCompletionsStreamStartMessage,
} from '../lib/aquilifer-protocol';
import { AQUILIFER_ERRORS, streamErrorEvent } from '../lib/errors';
import type { AquiliferPageEvent } from '../lib/public-api';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    window.addEventListener('message', async (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as
        | AquiliferPageMessage
        | AquiliferStreamStartMessage
        | AnthropicMessagesStreamStartMessage
        | OpenAIChatCompletionsStreamStartMessage
        | undefined;
      if (!data) return;

      if (data.source === AQUILIFER_PAGE_SOURCE) {
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
        return;
      }

      if (data.source === AQUILIFER_STREAM_PAGE_SOURCE) {
        startStream(data.id, data.params);
        return;
      }

      if (data.source === AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PAGE_SOURCE) {
        startProviderStream(
          AQUILIFER_ANTHROPIC_MESSAGES_STREAM_CONTENT_SOURCE,
          AQUILIFER_ANTHROPIC_MESSAGES_STREAM_PORT_NAME,
          data.id,
          data.params,
        );
        return;
      }

      if (
        data.source === AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PAGE_SOURCE
      ) {
        startProviderStream(
          AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_CONTENT_SOURCE,
          AQUILIFER_OPENAI_CHAT_COMPLETIONS_STREAM_PORT_NAME,
          data.id,
          data.params,
        );
      }
    });

    function startStream(
      id: string,
      params: AquiliferStreamStartMessage['params'],
    ) {
      const post = (event: AquiliferStreamEvent) =>
        window.postMessage(
          { source: AQUILIFER_STREAM_CONTENT_SOURCE, id, event },
          location.origin,
        );

      let port: ReturnType<typeof browser.runtime.connect>;
      try {
        port = browser.runtime.connect({ name: AQUILIFER_STREAM_PORT_NAME });
      } catch (error) {
        post({
          type: 'error',
          error: error instanceof Error ? error.message : 'relay_error',
        });
        return;
      }

      port.onMessage.addListener((message: AquiliferStreamPortEvent) => {
        post(message);
        if (message.type === 'done' || message.type === 'error') {
          port.disconnect();
        }
      });

      port.onDisconnect.addListener(() => {
        // Background restarted or otherwise dropped the port before sending
        // a terminal event — don't leave the page's stream hanging forever.
        post(streamErrorEvent(AQUILIFER_ERRORS.STREAM_DISCONNECTED));
      });

      const request: AquiliferStreamPortRequest = { id, params };
      port.postMessage(request);
    }

    // Shared by both provider-specific streams (SPEC §5, §10) — identical
    // relay logic to startStream() above, just parameterized by which
    // dedicated Port/content-source to use, since each interface's channel
    // is deliberately separate (§10 decision: no shared transport, so a
    // future breaking change to one can't ripple into another's callers).
    function startProviderStream(
      contentSource: string,
      portName: string,
      id: string,
      params: unknown,
    ) {
      const post = (event: AquiliferProviderStreamEvent<unknown>) =>
        window.postMessage({ source: contentSource, id, event }, location.origin);

      let port: ReturnType<typeof browser.runtime.connect>;
      try {
        port = browser.runtime.connect({ name: portName });
      } catch (error) {
        post({
          type: 'error',
          error: error instanceof Error ? error.message : 'relay_error',
        });
        return;
      }

      port.onMessage.addListener(
        (message: AquiliferProviderStreamEvent<unknown> & { id: string }) => {
          post(message);
          if (message.type === 'done' || message.type === 'error') {
            port.disconnect();
          }
        },
      );

      port.onDisconnect.addListener(() => {
        post(streamErrorEvent(AQUILIFER_ERRORS.STREAM_DISCONNECTED));
      });

      port.postMessage({ id, params });
    }

    // Opened once for the page's whole lifetime (unlike the per-call stream
    // port above) — events can arrive at any time, not just during a call.
    function connectEventsPort() {
      let port: ReturnType<typeof browser.runtime.connect>;
      try {
        port = browser.runtime.connect({ name: AQUILIFER_EVENTS_PORT_NAME });
      } catch {
        // Extension context is gone (e.g. reloaded/updated while this page
        // is still open) — nothing more to do for this page.
        return;
      }

      port.onMessage.addListener((event: AquiliferPageEvent) => {
        window.postMessage(
          { source: AQUILIFER_EVENT_CONTENT_SOURCE, event },
          location.origin,
        );
      });

      // The background service worker can go idle and restart at any time
      // — reconnect so the page keeps receiving future events rather than
      // silently going deaf after the first restart.
      port.onDisconnect.addListener(connectEventsPort);
    }

    connectEventsPort();
  },
});
