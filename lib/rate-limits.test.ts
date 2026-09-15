import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RATE_LIMIT_SETTINGS,
  getRateLimitSettings,
  setRateLimitSettings,
} from './rate-limits';

describe('getRateLimitSettings', () => {
  it('returns the defaults when nothing has been saved', async () => {
    expect(await getRateLimitSettings()).toEqual(DEFAULT_RATE_LIMIT_SETTINGS);
  });

  it('round-trips whatever was saved', async () => {
    const settings = {
      ...DEFAULT_RATE_LIMIT_SETTINGS,
      global: { threshold: 5, windowMinutes: 1 },
    };
    await setRateLimitSettings(settings);
    expect(await getRateLimitSettings()).toEqual(settings);
  });

  it('backfills missing nested fields from the defaults, e.g. after an old save predating a new interface', async () => {
    // Simulates a value saved before `openaiChatCompletions` existed as a
    // per-interface bucket — getRateLimitSettings must not blow up or drop
    // the other interfaces' thresholds just because one field is missing.
    await setRateLimitSettings({
      ...DEFAULT_RATE_LIMIT_SETTINGS,
      perInterface: {
        generic: { threshold: 3, windowMinutes: 2 },
      } as typeof DEFAULT_RATE_LIMIT_SETTINGS.perInterface,
    });

    const settings = await getRateLimitSettings();
    expect(settings.perInterface.generic).toEqual({
      threshold: 3,
      windowMinutes: 2,
    });
    expect(settings.perInterface.anthropicMessages).toEqual(
      DEFAULT_RATE_LIMIT_SETTINGS.perInterface.anthropicMessages,
    );
    expect(settings.perInterface.openaiChatCompletions).toEqual(
      DEFAULT_RATE_LIMIT_SETTINGS.perInterface.openaiChatCompletions,
    );
  });
});
