// Rate-limit / spend-cap settings (SPEC §4, §6). User-configurable from the
// options page. Frequency crossing a threshold blocks the request; size
// crossing its threshold is a non-blocking warning surfaced in History.
//
// Two-tiered (SPEC §4): a **global** limit summed across every history
// bucket (generic + each provider-specific interface) protects overall
// spend regardless of which interface a site uses; a **per-interface**
// limit additionally caps any single one of them tighter. A request is
// blocked if it exceeds either.
//
// Enforcement is always per connected site (origin) — a provider itself has
// no limit; every origin bound to it has its own independent budget against
// these same shared thresholds (background.ts's `computeRateLimitOutcome`
// and the popup's own status display both go through
// `computeOriginRateLimitStatus` below, so there's exactly one place this
// counting logic lives).

import * as anthropicMessagesHistory from './history/anthropic-messages';
import { countRecentEntries as countGenericEntries } from './history/generic';
import * as openaiChatCompletionsHistory from './history/openai-chat-completions';

export type RateLimitInterface =
  | 'generic'
  | 'anthropicMessages'
  | 'openaiChatCompletions';

export interface FrequencyLimit {
  /** Max requests allowed within the rolling window. */
  threshold: number;
  /** Rolling window size, in minutes. */
  windowMinutes: number;
}

export interface RateLimitSettings {
  global: FrequencyLimit;
  perInterface: Record<RateLimitInterface, FrequencyLimit>;
  /** Total request character count above which a request is flagged. */
  sizeThresholdChars: number;
  /** Show a browser notification when a request gets blocked. */
  notifyOnBlock: boolean;
  /** Open a popup window when a request gets blocked. */
  showPopupOnBlock: boolean;
}

export const DEFAULT_RATE_LIMIT_SETTINGS: RateLimitSettings = {
  global: { threshold: 40, windowMinutes: 10 },
  perInterface: {
    generic: { threshold: 20, windowMinutes: 10 },
    anthropicMessages: { threshold: 20, windowMinutes: 10 },
    openaiChatCompletions: { threshold: 20, windowMinutes: 10 },
  },
  sizeThresholdChars: 8000,
  notifyOnBlock: true,
  showPopupOnBlock: false,
};

const RATE_LIMIT_KEY = 'rateLimitSettings';

export async function getRateLimitSettings(): Promise<RateLimitSettings> {
  const stored = await browser.storage.local.get(RATE_LIMIT_KEY);
  const saved = stored[RATE_LIMIT_KEY] as
    | Partial<RateLimitSettings>
    | undefined;
  return {
    ...DEFAULT_RATE_LIMIT_SETTINGS,
    ...saved,
    global: { ...DEFAULT_RATE_LIMIT_SETTINGS.global, ...saved?.global },
    perInterface: {
      ...DEFAULT_RATE_LIMIT_SETTINGS.perInterface,
      ...saved?.perInterface,
    },
  };
}

export async function setRateLimitSettings(
  settings: RateLimitSettings,
): Promise<void> {
  await browser.storage.local.set({ [RATE_LIMIT_KEY]: settings });
}

function bucketCounter(interfaceName: RateLimitInterface) {
  switch (interfaceName) {
    case 'generic':
      return countGenericEntries;
    case 'anthropicMessages':
      return anthropicMessagesHistory.countRecentEntries;
    case 'openaiChatCompletions':
      return openaiChatCompletionsHistory.countRecentEntries;
  }
}

export interface TierStatus {
  count: number;
  threshold: number;
  blocked: boolean;
}

export interface OriginRateLimitStatus {
  global: TierStatus;
  perInterface: Record<RateLimitInterface, TierStatus>;
  blocked: boolean;
}

function tierStatus(count: number, threshold: number): TierStatus {
  return { count, threshold, blocked: count >= threshold };
}

/**
 * A single origin's real rate-limit standing right now, across every tier
 * (global + each interface) — the one place this counting logic lives, so
 * background.ts's request-time enforcement and the popup's own status
 * display can never drift apart from each other.
 */
export async function computeOriginRateLimitStatus(
  origin: string,
): Promise<OriginRateLimitStatus> {
  const settings = await getRateLimitSettings();
  const interfaceNames: RateLimitInterface[] = [
    'generic',
    'anthropicMessages',
    'openaiChatCompletions',
  ];

  const perInterfaceEntries = await Promise.all(
    interfaceNames.map(async (interfaceName) => {
      const threshold = settings.perInterface[interfaceName];
      const count = await bucketCounter(interfaceName)(
        origin,
        threshold.windowMinutes * 60_000,
      );
      return [interfaceName, tierStatus(count, threshold.threshold)] as const;
    }),
  );
  const perInterface = Object.fromEntries(perInterfaceEntries) as Record<
    RateLimitInterface,
    TierStatus
  >;

  // The global tier sums the same window across every interface — recount
  // with the global window rather than reusing `perInterfaceEntries` above,
  // since each interface's own window (checked per-tier) can differ from
  // the global one.
  const globalCounts = await Promise.all(
    interfaceNames.map((interfaceName) =>
      bucketCounter(interfaceName)(
        origin,
        settings.global.windowMinutes * 60_000,
      ),
    ),
  );
  const global = tierStatus(
    globalCounts.reduce((sum, count) => sum + count, 0),
    settings.global.threshold,
  );

  const blocked =
    global.blocked || Object.values(perInterface).some((tier) => tier.blocked);

  return { global, perInterface, blocked };
}
