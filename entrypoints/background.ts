import type {
  AquiliferChatParams,
  AquiliferPageEvent,
  AquiliferProviderInfo,
  AquiliferRequestPayload,
  AquiliferResponsePayload,
  AquiliferStreamEvent,
  AquiliferStreamPortEvent,
  AquiliferStreamPortRequest,
} from '../lib/aquilifer-protocol';
import {
  AQUILIFER_EVENTS_PORT_NAME,
  AQUILIFER_STREAM_PORT_NAME,
} from '../lib/aquilifer-protocol';
import {
  appendHistoryEntry,
  countRecentEntries,
  listHistoryForOrigin,
} from '../lib/history/generic';
import * as anthropicMessagesHistory from '../lib/history/anthropic-messages';
import * as openaiChatCompletionsHistory from '../lib/history/openai-chat-completions';
import { isInternalMessage, type InternalMessage } from '../lib/internal-protocol';
import { runChat, runChatStream } from '../lib/llm-clients';
import {
  callAnthropicMessages,
  callOpenAIChatCompletions,
} from '../lib/provider-interfaces';
import {
  listProviders,
  type AnthropicProvider,
  type OpenAICompatibleProvider,
  type ProviderConfig,
  type ProviderType,
} from '../lib/providers';
import { loadOriginGrants, saveOriginGrants } from '../lib/permissions';
import {
  getRateLimitSettings,
  type RateLimitInterface,
} from '../lib/rate-limits';

type ApprovalOutcome =
  | { approved: true; providerId: string }
  | { approved: false; reason: string; code?: string };

export default defineBackground(() => {
  // origin -> bound providerId, chosen by the user in the approval popup.
  // Exactly one provider per origin, always — a provider-specific call
  // needing a different type triggers a switch (replacing this), never an
  // additional grant (SPEC §4).
  const originGrants = new Map<string, string>();
  const pendingApprovals = new Map<
    string,
    {
      resolve: (outcome: ApprovalOutcome) => void;
      windowId?: number;
      /** True only for a switch request where zero providers of the
       *  required type exist — a more specific reason than a plain denial. */
      noProviderOfType: boolean;
      deniedReason: string;
      deniedCode?: string;
    }
  >();
  const windowIdToOrigin = new Map<number, string>();
  // origin -> every open events Port for that origin (one per tab/page).
  const eventPorts = new Map<
    string,
    Set<ReturnType<typeof browser.runtime.connect>>
  >();

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
    if (port.name === AQUILIFER_STREAM_PORT_NAME) {
      port.onMessage.addListener((message) =>
        handleStreamRequest(port, message as AquiliferStreamPortRequest),
      );
      return;
    }

    if (port.name === AQUILIFER_EVENTS_PORT_NAME) {
      const sender = port.sender;
      const origin =
        sender?.origin ?? (sender?.url ? new URL(sender.url).origin : undefined);
      if (!origin) return;

      let ports = eventPorts.get(origin);
      if (!ports) {
        ports = new Set();
        eventPorts.set(origin, ports);
      }
      ports.add(port);

      port.onDisconnect.addListener(() => {
        ports?.delete(port);
        if (ports && ports.size === 0) eventPorts.delete(origin);
      });
    }
  });

  browser.windows.onRemoved.addListener((windowId) => {
    const origin = windowIdToOrigin.get(windowId);
    if (!origin) return;
    windowIdToOrigin.delete(windowId);

    // Window closed without an explicit Approve/Deny click (e.g. the user hit
    // the X) counts as a denial — never leave a request hanging forever.
    resolvePendingDenial(origin);
  });

  function resolvePendingDenial(origin: string) {
    const pending = pendingApprovals.get(origin);
    if (!pending) return;
    pendingApprovals.delete(origin);
    pending.resolve(
      pending.noProviderOfType
        ? {
            approved: false,
            reason: 'no_provider_of_type',
            code: 'no_provider_of_type',
          }
        : {
            approved: false,
            reason: pending.deniedReason,
            code: pending.deniedCode,
          },
    );
  }

  function providerInfoFor(provider: ProviderConfig): AquiliferProviderInfo {
    return { type: provider.type, model: provider.resolvedModel ?? provider.model };
  }

  /** Pushes a page event (SPEC §5) to every open tab of `origin` — the tab
   *  that triggered the change already knows via its own response/Promise;
   *  this is what lets *other* tabs of the same origin stay in sync. */
  function broadcastEvent(origin: string, event: AquiliferPageEvent) {
    const ports = eventPorts.get(origin);
    if (!ports) return;
    for (const port of ports) {
      try {
        port.postMessage(event);
      } catch {
        // Port already gone; its own onDisconnect will clean the set up.
      }
    }
  }

  async function handleInternalMessage(
    message: InternalMessage,
  ): Promise<{ ok: true }> {
    if (message.type === 'resolveConnect') {
      const pending = pendingApprovals.get(message.origin);
      if (pending) {
        if (pending.windowId != null) {
          windowIdToOrigin.delete(pending.windowId);
          browser.windows.remove(pending.windowId).catch(() => {});
        }

        if (message.approve) {
          pendingApprovals.delete(message.origin);
          pending.resolve({ approved: true, providerId: message.providerId });
        } else {
          resolvePendingDenial(message.origin);
        }
      }
    }

    if (message.type === 'revokeOrigin') {
      originGrants.delete(message.origin);
      persistOriginGrants();
      broadcastEvent(message.origin, { name: 'disconnect' });
    }

    return { ok: true };
  }

  /**
   * Opens the approval popup — used both for a fresh `connect` (no
   * `requiredType`) and for a provider-specific-interface switch request
   * (§4, §5). Resolves once the popup is answered one way or another.
   */
  async function openApprovalPopup(
    origin: string,
    options: { requiredType?: ProviderType; currentProviderLabel?: string } = {},
  ): Promise<ApprovalOutcome> {
    const providers = await listProviders();
    const matching = options.requiredType
      ? providers.filter((provider) => provider.type === options.requiredType)
      : providers;

    return new Promise<ApprovalOutcome>((resolve) => {
      pendingApprovals.set(origin, {
        resolve,
        noProviderOfType: Boolean(options.requiredType) && matching.length === 0,
        deniedReason: options.requiredType ? 'switch_denied' : 'connect_denied',
        deniedCode: options.requiredType ? 'switch_denied' : undefined,
      });

      const params = new URLSearchParams({ origin });
      if (options.requiredType) params.set('requiredType', options.requiredType);
      if (options.currentProviderLabel) {
        params.set('currentProviderLabel', options.currentProviderLabel);
      }

      browser.windows
        .create({
          url: browser.runtime.getURL(`/approve.html?${params.toString()}`),
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
   * Ensures `origin` is bound to a provider of `requiredType`, prompting a
   * switch (§4, §5) if it currently isn't. A switch replaces the origin's
   * entire binding — generic `chat`/`stream` start using the new provider
   * too, not just the call that triggered the switch.
   */
  async function ensureProviderType(
    origin: string,
    requiredType: ProviderType,
  ): Promise<
    { ok: true; provider: ProviderConfig } | { ok: false; error: string; code?: string }
  > {
    const bound = await resolveBoundProvider(origin);
    if (bound && bound.type === requiredType) {
      return { ok: true, provider: bound };
    }

    if (pendingApprovals.has(origin)) {
      return { ok: false, error: 'connect_pending' };
    }

    const outcome = await openApprovalPopup(origin, {
      requiredType,
      currentProviderLabel: bound?.label,
    });

    if (!outcome.approved) {
      return { ok: false, error: outcome.reason, code: outcome.code };
    }

    originGrants.set(origin, outcome.providerId);
    persistOriginGrants();

    const providers = await listProviders();
    const provider = providers.find((p) => p.id === outcome.providerId);
    if (!provider) {
      return {
        ok: false,
        error: 'provider_unavailable',
        code: 'provider_unavailable',
      };
    }

    // `bound` truthy means this was a switch (already connected, just to a
    // different type); falsy means this origin just connected for the
    // first time.
    broadcastEvent(origin, {
      name: bound ? 'permissionChanged' : 'connect',
      detail: providerInfoFor(provider),
    });
    return { ok: true, provider };
  }

  function bucketCounter(interfaceName: RateLimitInterface) {
    switch (interfaceName) {
      case 'generic':
        return countRecentEntries;
      case 'anthropicMessages':
        return anthropicMessagesHistory.countRecentEntries;
      case 'openaiChatCompletions':
        return openaiChatCompletionsHistory.countRecentEntries;
    }
  }

  async function countAcrossAllInterfaces(
    origin: string,
    windowMs: number,
  ): Promise<number> {
    const counts = await Promise.all(
      (
        ['generic', 'anthropicMessages', 'openaiChatCompletions'] as const
      ).map((interfaceName) => bucketCounter(interfaceName)(origin, windowMs)),
    );
    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Size crossing its threshold is a non-blocking warning; frequency is
   * two-tiered (SPEC §4): a global limit summed across every interface's
   * history bucket, and a tighter per-interface limit on top. Blocked if
   * either is exceeded. All counts read existing history entries, so this
   * costs no extra state.
   */
  async function computeRateLimitOutcome(
    origin: string,
    interfaceName: RateLimitInterface,
    sizeChars: number,
  ): Promise<{ warnings: string[]; blocked: boolean }> {
    const settings = await getRateLimitSettings();
    const warnings: string[] = [];

    if (sizeChars > settings.sizeThresholdChars) {
      warnings.push('large_request');
    }

    const perInterface = settings.perInterface[interfaceName];
    const perInterfaceCount = await bucketCounter(interfaceName)(
      origin,
      perInterface.windowMinutes * 60_000,
    );
    const perInterfaceBlocked = perInterfaceCount >= perInterface.threshold;

    const globalCount = await countAcrossAllInterfaces(
      origin,
      settings.global.windowMinutes * 60_000,
    );
    const globalBlocked = globalCount >= settings.global.threshold;

    const blocked = perInterfaceBlocked || globalBlocked;
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
        message: `${origin} hit a rate limit and was blocked.`,
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
    const totalChars = params.messages.reduce(
      (sum, message) => sum + message.content.length,
      0,
    );
    const { warnings, blocked } = await computeRateLimitOutcome(
      origin,
      'generic',
      totalChars,
    );
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

        const outcome = await openApprovalPopup(origin);
        if (outcome.approved) {
          originGrants.set(origin, outcome.providerId);
          persistOriginGrants();

          const providers = await listProviders();
          const provider = providers.find((p) => p.id === outcome.providerId);
          if (provider) {
            broadcastEvent(origin, {
              name: 'connect',
              detail: providerInfoFor(provider),
            });
          }
          return { ok: true, result: { connected: true } };
        }
        return {
          ok: false,
          error: outcome.reason,
          ...(outcome.code ? { code: outcome.code } : {}),
        };
      }

      case 'disconnect':
        originGrants.delete(origin);
        persistOriginGrants();
        broadcastEvent(origin, { name: 'disconnect' });
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
        return { ok: true, result: providerInfoFor(provider) };
      }

      // Read-only status check (SPEC §5, §9) — unlike every other method
      // here, "not connected" is a normal successful outcome, not an error,
      // and this must never open the approval popup (fallback callers rely
      // on that to probe silently). resolveBoundProvider() is a pure lookup.
      case 'isConnected': {
        const provider = await resolveBoundProvider(origin);
        return { ok: true, result: { connected: Boolean(provider) } };
      }

      // Provider-specific interfaces (SPEC §5), gated by connection/switch
      // approval and the same two-tier rate limiting as `chat` (§4).
      case 'anthropicMessages': {
        const resolved = await ensureProviderType(origin, 'anthropic');
        if (!resolved.ok) {
          return {
            ok: false,
            error: resolved.error,
            ...(resolved.code ? { code: resolved.code } : {}),
          };
        }
        const provider = resolved.provider as AnthropicProvider;
        const fullRequestJson = JSON.stringify(payload.params);
        const requestSummary = fullRequestJson.slice(0, 500);

        const { warnings, blocked } = await computeRateLimitOutcome(
          origin,
          'anthropicMessages',
          fullRequestJson.length,
        );
        if (blocked) {
          await anthropicMessagesHistory.appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            requestSummary,
            outcome: { ok: false, error: 'rate_limited' },
            warnings,
          });
          await handleBlocked(origin);
          return { ok: false, error: 'rate_limited' };
        }

        try {
          const result = await callAnthropicMessages(provider, payload.params);
          await anthropicMessagesHistory.appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            requestSummary,
            outcome: {
              ok: true,
              responseSummary: JSON.stringify(result).slice(0, 500),
            },
            warnings,
          });
          return { ok: true, result };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'chat_failed';
          await anthropicMessagesHistory.appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            requestSummary,
            outcome: { ok: false, error: errorMessage },
            warnings,
          });
          return { ok: false, error: errorMessage };
        }
      }

      case 'openaiChatCompletions': {
        const resolved = await ensureProviderType(origin, 'openai-compatible');
        if (!resolved.ok) {
          return {
            ok: false,
            error: resolved.error,
            ...(resolved.code ? { code: resolved.code } : {}),
          };
        }
        const provider = resolved.provider as OpenAICompatibleProvider;
        const fullRequestJson = JSON.stringify(payload.params);
        const requestSummary = fullRequestJson.slice(0, 500);

        const { warnings, blocked } = await computeRateLimitOutcome(
          origin,
          'openaiChatCompletions',
          fullRequestJson.length,
        );
        if (blocked) {
          await openaiChatCompletionsHistory.appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            requestSummary,
            outcome: { ok: false, error: 'rate_limited' },
            warnings,
          });
          await handleBlocked(origin);
          return { ok: false, error: 'rate_limited' };
        }

        try {
          const result = await callOpenAIChatCompletions(
            provider,
            payload.params,
          );
          await openaiChatCompletionsHistory.appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            requestSummary,
            outcome: {
              ok: true,
              responseSummary: JSON.stringify(result).slice(0, 500),
            },
            warnings,
          });
          return { ok: true, result };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'chat_failed';
          await openaiChatCompletionsHistory.appendHistoryEntry({
            id: crypto.randomUUID(),
            origin,
            timestamp: Date.now(),
            providerId: provider.id,
            providerLabel: provider.label,
            requestSummary,
            outcome: { ok: false, error: errorMessage },
            warnings,
          });
          return { ok: false, error: errorMessage };
        }
      }

      default:
        return { ok: false, error: 'unknown_method' };
    }
  }
});
