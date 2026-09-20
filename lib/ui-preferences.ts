// Display-only preferences for the extension's own UI — font scale and the
// toolbar popup's width — user-configurable from Options' Appearance tab.
// Not security/permission-relevant, but still routed through a lib module,
// matching every other stored setting in this codebase (rate-limits.ts,
// history-display-prefs.ts, providers.ts, permissions.ts).

export interface UiPreferences {
  /** Multiplies every --font-size-* CSS variable, across every surface
   *  (popup, options, approve, blocked, unlock) — 1 is each stylesheet's
   *  own already-tuned baseline size, not an arbitrary "no preference"
   *  value. */
  fontScale: number;
  /** The toolbar popup's own body width, in px. Doesn't affect the
   *  approve/blocked/unlock popup windows — those are separate, transient
   *  dialogs sized directly in background.ts, not this repeatedly-opened
   *  surface. */
  popupWidth: number;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  fontScale: 1,
  popupWidth: 500,
};

const UI_PREFERENCES_KEY = 'uiPreferences';

export async function getUiPreferences(): Promise<UiPreferences> {
  const stored = await browser.storage.local.get(UI_PREFERENCES_KEY);
  const saved = stored[UI_PREFERENCES_KEY] as
    | Partial<UiPreferences>
    | undefined;
  return { ...DEFAULT_UI_PREFERENCES, ...saved };
}

export async function setUiPreferences(prefs: UiPreferences): Promise<void> {
  await browser.storage.local.set({ [UI_PREFERENCES_KEY]: prefs });
}
