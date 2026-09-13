import type {
  AquiliferChatParams,
  AquiliferProviderInfo,
  AquiliferRequestPayload,
  AquiliferResponsePayload,
  AquiliferStreamEvent,
  AquiliferStreamPortEvent,
  AquiliferStreamPortRequest,
} from '../lib/aquilifer-protocol';
import { AQUILIFER_STREAM_PORT_NAME } from '../lib/aquilifer-protocol';
import {
  appendHistoryEntry,
  countRecentEntries,
  listHistoryForOrigin,
} from '../lib/history/generic';
import { isInternalMessage, type InternalMessage } from '../lib/internal-protocol';
import { runChat, runChatStream } from '../lib/llm-clients';
import { listProviders, type ProviderConfig } from '../lib/providers';
import { loadOriginGrants, saveOriginGrants } from '../lib/permissions';
import { getRateLimitSettings } from '../lib/rate-limits';

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

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== AQUILIFER_STREAM_PORT_NAME) return;
    port.onMessage.addListener((message) =>
      handleStreamRequest(port, message as AquiliferStreamPortRequest),
    );
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

    if (message.type === 'revokeOrigin') {
      originGrants.delete(message.origin);
      persistOriginGrants();
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

  /**
   * Size crossing its threshold is a non-blocking warning; frequency
   * crossing its threshold blocks the request (SPEC §4, §6). The frequency
   * count is based on existing history entries, so it costs no extra state.
   */
  async function checkRateLimit(
    origin: string,
    params: AquiliferChatParams,
  ): Promise<{ warnings: string[]; blocked: boolean }> {
    const settings = await getRateLimitSettings();
    const warnings: string[] = [];

    const totalChars = params.messages.reduce(
      (sum, message) => sum + message.content.length,
      0,
    );
    if (totalChars > settings.sizeThresholdChars) {
      warnings.push('large_request');
    }

    const windowMs = settings.frequencyWindowMinutes * 60_000;
    const recentCount = await countRecentEntries(origin, windowMs);
    const blocked = recentCount >= settings.frequencyThreshold;
    if (blocked) warnings.push('rate_limited');

    return { warnings, blocked };
  }

  async function handleBlocked(origin: string) {
    const settings = await getRateLimitSettings();

    if (settings.notifyOnBlock) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icon/128.png'),
        title: 'Aquilifer: request blocked',
        message: `${origin} hit the rate limit (${settings.frequencyThreshold} requests / ${settings.frequencyWindowMinutes} min) and was blocked.`,
      });
    }

    if (settings.showPopupOnBlock) {
      browser.windows.create({
        url: browser.runtime.getURL(
          `/blocked.html?origin=${encodeURIComponent(origin)}`,
        ),
        type: 'popup',
        width: 360,
        height: 260,
      });
    }
  }

  /** Shared by `chat` and the streaming port handler below. */
  async function checkAndLogIfBlocked(
    origin: string,
    provider: ProviderConfig,
    params: AquiliferChatParams,
  ): Promise<{ blocked: boolean; warnings: string[] }> {
    const { warnings, blocked } = await checkRateLimit(origin, params);
    if (blocked) {
      await appendHistoryEntry({
        id: crypto.randomUUID(),
        origin,
        timestamp: Date.now(),
        providerId: provider.id,
        providerLabel: provider.label,
        messages: params.messages,
        outcome: { ok: false, error: 'rate_limited' },
        warnings,
      });
      await handleBlocked(origin);
    }
    return { blocked, warnings };
  }

  async function handleStreamRequest(
    port: ReturnType<typeof browser.runtime.connect>,
    message: AquiliferStreamPortRequest,
  ) {
    const { id, params } = message;
    const sender = port.sender;
    const origin =
      sender?.origin ?? (sender?.url ? new URL(sender.url).origin : undefined);

    function send(event: AquiliferStreamEvent) {
      const portEvent: AquiliferStreamPortEvent = { ...event, id };
      port.postMessage(portEvent);
    }

    if (!origin) {
      send({ type: 'error', error: 'unknown_origin' });
      return;
    }
    await originGrantsLoaded;

    const provider = await resolveBoundProvider(origin);
    if (!provider) {
      send({ type: 'error', error: 'not_connected' });
      return;
    }
    if (!params?.messages?.length) {
      send({ type: 'error', error: 'missing_messages' });
      return;
    }

    const { blocked, warnings } = await checkAndLogIfBlocked(
      origin,
      provider,
      params,
    );
    if (blocked) {
      send({ type: 'error', error: 'rate_limited' });
      return;
    }

    let assembled = '';
    try {
      await runChatStream(provider, params, (delta) => {
        assembled += delta;
        send({ type: 'chunk', delta });
      });
      await appendHistoryEntry({
        id: crypto.randomUUID(),
        origin,
        timestamp: Date.now(),
        providerId: provider.id,
        providerLabel: provider.label,
        messages: params.messages,
        outcome: { ok: true, message: assembled },
        warnings,
      });
      send({ type: 'done' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'chat_failed';
      await appendHistoryEntry({
        id: crypto.randomUUID(),
        origin,
        timestamp: Date.now(),
        providerId: provider.id,
        providerLabel: provider.label,
        messages: params.messages,
        outcome: { ok: false, error: errorMessage },
        warnings,
      });
      send({ type: 'error', error: errorMessage });
    }
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

        const { warnings, blocked } = await checkAndLogIfBlocked(
          origin,
          provider,
          payload.params,
        );
        if (blocked) {
          return { ok: false, error: 'rate_limited' };
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
            warnings,
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
            warnings,
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

      case 'getProvider': {
        const provider = await resolveBoundProvider(origin);
        if (!provider) {
          return { ok: false, error: 'not_connected' };
        }
        const info: AquiliferProviderInfo = {
          type: provider.type,
          model: provider.resolvedModel ?? provider.model,
        };
        return { ok: true, result: info };
      }

      default:
        return { ok: false, error: 'unknown_method' };
    }
  }
});
