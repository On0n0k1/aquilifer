// Display-only preference for how History's entry cards render (SPEC §7,
// §15) — not security/permission-relevant, but still routed through a lib
// module rather than called directly from a component, matching every
// other stored setting in this codebase (rate-limits.ts, providers.ts,
// permissions.ts).

export type HistoryCardTheme = 'dark' | 'light';

const CARD_THEME_KEY = 'historyCardTheme';

export async function getHistoryCardTheme(): Promise<HistoryCardTheme> {
  const stored = await browser.storage.local.get(CARD_THEME_KEY);
  const theme = stored[CARD_THEME_KEY] as HistoryCardTheme | undefined;
  return theme === 'light' ? 'light' : 'dark';
}

export async function setHistoryCardTheme(
  theme: HistoryCardTheme,
): Promise<void> {
  await browser.storage.local.set({ [CARD_THEME_KEY]: theme });
}
