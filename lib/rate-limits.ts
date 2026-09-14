// Rate-limit / spend-cap settings (SPEC §4, §6). User-configurable from the
// options page. Frequency crossing a threshold blocks the request; size
// crossing its threshold is a non-blocking warning surfaced in History.
//
// Two-tiered (SPEC §4): a **global** limit summed across every history
// bucket (generic + each provider-specific interface) protects overall
// spend regardless of which interface a site uses; a **per-interface**
// limit additionally caps any single one of them tighter. A request is
// blocked if it exceeds either.

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
