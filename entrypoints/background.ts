import type {
  AquiliferRequestPayload,
  AquiliferResponsePayload,
} from '../lib/aquilifer-protocol';
import { appendHistoryEntry, listHistoryForOrigin } from '../lib/history';
import { isInternalMessage, type InternalMessage } from '../lib/internal-protocol';
import { runChat } from '../lib/llm-clients';
import { listProviders, type ProviderConfig } from '../lib/providers';
import { loadOriginGrants, saveOriginGrants } from '../lib/permissions';

export default defineBackground(() => {
  // origin -> bound providerId, chosen by the user in the approval popup.
  const originGrants = new Map<string, string>();
  const pendingApprovals = new Map<
    string,
    { resolve: (response: AquiliferResponsePayload) => void; windowId?: number }
  >();
  const windowIdToOrigin = new Map<number, string>();

  // Awaited at the top of handleRequest — the service worker can restart and
  // receive a message before this resolves, which would otherwise reject an
  // already-approved origin as not_connected.
  const originGrantsLoaded = loadOriginGrants().then((grants) => {
    for (const [origin, providerId] of Object.entries(grants)) {
      originGrants.set(origin, providerId);
    }
  });

  function persistOriginGrants() {
    saveOriginGrants(Object.fromEntries(originGrants));
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
          originGrants.set(message.origin, message.providerId);
          persistOriginGrants();
          pending.resolve({ ok: true, result: { connected: true } });
        } else {
          pending.resolve({ ok: false, error: 'connect_denied' });
        }
      }
    }
    return { ok: true };
  }

  /**
   * Looks up the provider bound to `origin`'s grant. If the grant points at a
   * provider that no longer exists (deleted since the site connected), the
   * stale grant is cleared here so the origin goes back to "not connected"
   * instead of silently failing every future request.
   */
  async function resolveBoundProvider(
    origin: string,
  ): Promise<ProviderConfig | undefined> {
    const boundProviderId = originGrants.get(origin);
    if (!boundProviderId) return undefined;

    const providers = await listProviders();
    const provider = providers.find((p) => p.id === boundProviderId);
    if (!provider) {
      originGrants.delete(origin);
      persistOriginGrants();
    }
    return provider;
  }

  async function handleRequest(
    payload: AquiliferRequestPayload,
    origin: string | undefined,
  ): Promise<AquiliferResponsePayload> {
    if (!origin) return { ok: false, error: 'unknown_origin' };
    await originGrantsLoaded;

    switch (payload.method) {
      case 'connect': {
        if (await resolveBoundProvider(origin)) {
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
              height: 320,
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
        originGrants.delete(origin);
        persistOriginGrants();
        return { ok: true, result: { connected: false } };

      case 'chat': {
        const provider = await resolveBoundProvider(origin);
        if (!provider) {
          return { ok: false, error: 'not_connected' };
        }
        if (!payload.params?.messages?.length) {
          return { ok: false, error: 'missing_messages' };
        }

        try {
          const result = await runChat(provider, payload.params);
          await appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            messages: payload.params.messages,
            outcome: { ok: true, message: result.text },
          });
          return { ok: true, result: { message: result.text } };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'chat_failed';
          await appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            messages: payload.params.messages,
            outcome: { ok: false, error: errorMessage },
          });
          return { ok: false, error: errorMessage };
        }
      }

      case 'getHistory': {
        if (!originGrants.has(origin)) {
          return { ok: false, error: 'not_connected' };
        }
        const entries = await listHistoryForOrigin(origin);
        return { ok: true, result: entries };
      }

      default:
        return { ok: false, error: 'unknown_method' };
    }
  }
});
