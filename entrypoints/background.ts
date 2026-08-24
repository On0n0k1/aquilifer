import type {
  AquiliferRequestPayload,
  AquiliferResponsePayload,
} from '../lib/aquilifer-protocol';

export default defineBackground(() => {
  // In-memory only for this step. Persistent per-origin grants and the real
  // approval UI (SPEC §4) land in a later step.
  const connectedOrigins = new Set<string>();

  browser.runtime.onMessage.addListener((message, sender) => {
    const origin =
      sender.origin ?? (sender.url ? new URL(sender.url).origin : undefined);
    return handleRequest(message as AquiliferRequestPayload, origin);
  });

  async function handleRequest(
    payload: AquiliferRequestPayload,
    origin: string | undefined,
  ): Promise<AquiliferResponsePayload> {
    if (!origin) return { ok: false, error: 'unknown_origin' };

    switch (payload.method) {
      case 'connect':
        connectedOrigins.add(origin);
        return { ok: true, result: { connected: true } };

      case 'disconnect':
        connectedOrigins.delete(origin);
        return { ok: true, result: { connected: false } };

      case 'chat':
        if (!connectedOrigins.has(origin)) {
          return { ok: false, error: 'not_connected' };
        }
        // Stub: proves the relay end-to-end. Real LLM call is a later step.
        return {
          ok: true,
          result: {
            message: `stub completion for origin ${origin}`,
            echo: payload.params,
          },
        };

      default:
        return { ok: false, error: 'unknown_method' };
    }
  }
});
