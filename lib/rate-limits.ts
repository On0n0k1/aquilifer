// Rate-limit / spend-cap settings (SPEC §4, §6). User-configurable from the
// options page. Frequency crossing the threshold blocks the request; size
// crossing its threshold is a non-blocking warning surfaced in History.

export interface RateLimitSettings {
  /** Max chat calls allowed per origin within the rolling window. */
  frequencyThreshold: number;
  /** Rolling window size, in minutes. */
  frequencyWindowMinutes: number;
  /** Total message character count above which a request is flagged. */
  sizeThresholdChars: number;
  /** Show a browser notification when a request gets blocked. */
  notifyOnBlock: boolean;
  /** Open a popup window when a request gets blocked. */
  showPopupOnBlock: boolean;
}

export const DEFAULT_RATE_LIMIT_SETTINGS: RateLimitSettings = {
  frequencyThreshold: 20,
  frequencyWindowMinutes: 10,
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
  return { ...DEFAULT_RATE_LIMIT_SETTINGS, ...saved };
}

export async function setRateLimitSettings(
  settings: RateLimitSettings,
): Promise<void> {
  await browser.storage.local.set({ [RATE_LIMIT_KEY]: settings });
}
