import { type FormEvent, useEffect, useState } from 'react';
import { applyUiPreferences } from '../../lib/apply-ui-preferences';
import {
  DEFAULT_UI_PREFERENCES,
  getUiPreferences,
  setUiPreferences,
  type UiPreferences,
} from '../../lib/ui-preferences';

function AppearanceSection() {
  const [prefs, setPrefs] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUiPreferences().then(setPrefs);
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    await setUiPreferences(prefs);
    // Applies immediately to this already-open Options page too, instead
    // of only taking effect the next time it's reopened.
    await applyUiPreferences();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section>
      <h2>Appearance</h2>
      <form onSubmit={handleSave}>
        <label title="Scales every piece of text across the popup, settings, and every approval/unlock popup together, proportionally.">
          Font size (%)
          <input
            type="number"
            min={50}
            max={200}
            step={10}
            value={Math.round(prefs.fontScale * 100)}
            onChange={(event) =>
              setPrefs({
                ...prefs,
                fontScale: Number(event.target.value) / 100,
              })
            }
          />
        </label>

        <label title="Only the toolbar popup's own width — not the connection-approval, rate-limit, or vault-unlock popups, which are separate, transient windows.">
          Popup width (pixels)
          <input
            type="number"
            min={300}
            max={900}
            step={10}
            value={prefs.popupWidth}
            onChange={(event) =>
              setPrefs({ ...prefs, popupWidth: Number(event.target.value) })
            }
          />
        </label>

        <button type="submit">{saved ? 'Saved' : 'Save appearance'}</button>
      </form>
    </section>
  );
}

export default AppearanceSection;
