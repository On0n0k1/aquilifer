import type {
  AquiliferRequestPayload,
  AquiliferResponsePayload,
} from '../lib/aquilifer-protocol';
import { isInternalMessage, type InternalMessage } from '../lib/internal-protocol';

const CONNECTED_ORIGINS_KEY = 'connectedOrigins';

export default defineBackground(() => {
  const connectedOrigins = new Set<string>();
  const pendingApprovals = new Map<
    string,
    { resolve: (response: AquiliferResponsePayload) => void; windowId?: number }
  >();
  const windowIdToOrigin = new Map<number, string>();

  browser.storage.local.get(CONNECTED_ORIGINS_KEY).then((stored) => {
    const saved = (stored[CONNECTED_ORIGINS_KEY] as string[] | undefined) ?? [];
    saved.forEach((origin) => connectedOrigins.add(origin));
  });

  function persistConnectedOrigins() {
    browser.storage.local.set({
      [CONNECTED_ORIGINS_KEY]: [...connectedOrigins],
    });
  }

  browser.runtime.onMessage.addListener((message, sender) => {
    if (isInternalMessage(message)) return handleInternalMessage(message);

    const origin =
      sender.origin ?? (sender.url ? new URL(sender.url).origin : undefined);
    return handleRequest(message as AquiliferRequestPayload, origin);
  });

  browser.windows.onRemoved.addListener((windowId) => {
    const origin = windowIdToOrigin.get(windowId);
    if (!origin) return;
    windowIdToOrigin.delete(windowId);

    // Window closed without an explicit Approve/Deny click (e.g. the user hit
    // the X) counts as a denial — never leave a request hanging forever.
    const pending = pendingApprovals.get(origin);
    if (pending) {
      pendingApprovals.delete(origin);
      pending.resolve({ ok: false, error: 'connect_denied' });
    }
  });

  async function handleInternalMessage(
    message: InternalMessage,
  ): Promise<{ ok: true }> {
    if (message.type === 'resolveConnect') {
      const pending = pendingApprovals.get(message.origin);
      if (pending) {
        pendingApprovals.delete(message.origin);
        if (pending.windowId != null) {
          windowIdToOrigin.delete(pending.windowId);
          browser.windows.remove(pending.windowId).catch(() => {});
        }

        if (message.approve) {
          connectedOrigins.add(message.origin);
          persistConnectedOrigins();
          pending.resolve({ ok: true, result: { connected: true } });
        } else {
          pending.resolve({ ok: false, error: 'connect_denied' });
        }
      }
    }
    return { ok: true };
  }

  async function handleRequest(
    payload: AquiliferRequestPayload,
    origin: string | undefined,
  ): Promise<AquiliferResponsePayload> {
    if (!origin) return { ok: false, error: 'unknown_origin' };

    switch (payload.method) {
      case 'connect': {
        if (connectedOrigins.has(origin)) {
          return { ok: true, result: { connected: true } };
        }
        if (pendingApprovals.has(origin)) {
          return { ok: false, error: 'connect_pending' };
        }

        return new Promise<AquiliferResponsePayload>((resolve) => {
          pendingApprovals.set(origin, { resolve });
          browser.windows
            .create({
              url: browser.runtime.getURL(
                `/approve.html?origin=${encodeURIComponent(origin)}`,
              ),
              type: 'popup',
              width: 380,
              height: 280,
            })
            .then((win) => {
              if (win?.id == null) return;
              windowIdToOrigin.set(win.id, origin);
              const stillPending = pendingApprovals.get(origin);
              if (stillPending) stillPending.windowId = win.id;
            });
        });
      }

      case 'disconnect':
        connectedOrigins.delete(origin);
        persistConnectedOrigins();
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
