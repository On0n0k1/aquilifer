// Applies stored UI preferences (font scale, popup width) to the current
// page's :root, so every surface picks up the user's saved choice on load
// instead of always rendering at each stylesheet's own hardcoded default.
// Called once, awaited before the first render, from every entrypoint's
// main.tsx — awaiting first avoids a visible jump from the default scale
// to the saved one once storage resolves.
//
// --popup-width only affects popup/style.css's body width; every other
// stylesheet simply never reads that variable, so setting it everywhere
// is harmless rather than worth special-casing per entrypoint. Height is
// deliberately not a preference here — the popup's height is always
// content-driven, the same as any other ordinary page.

import { getUiPreferences } from './ui-preferences';

export async function applyUiPreferences(): Promise<void> {
  const { fontScale, popupWidth } = await getUiPreferences();
  const root = document.documentElement.style;
  root.setProperty('--font-scale', String(fontScale));
  root.setProperty('--popup-width', `${popupWidth}px`);
}
