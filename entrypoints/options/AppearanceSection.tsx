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

  function handleFontScaleChange(percent: number) {
    const fontScale = percent / 100;
    setPrefs((current) => ({ ...current, fontScale }));
    // Live preview on this page as the slider moves — lets you land on a
    // size by eye instead of save-check-adjust-save-check-adjust. Save
    // still only persists it (and re-applies it, redundantly but
    // harmlessly, to make the intent explicit either way).
    document.documentElement.style.setProperty(
      '--font-scale',
      String(fontScale),
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    await setUiPreferences(prefs);
    await applyUiPreferences();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fontPercent = Math.round(prefs.fontScale * 100);

  return (
    <section>
      <h2>Appearance</h2>
      <form onSubmit={handleSave}>
        <label title="Scales every piece of text across the popup, settings, and every approval/unlock popup together, proportionally.">
          Font size ({fontPercent}%)
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={fontPercent}
            onChange={(event) =>
              handleFontScaleChange(Number(event.target.value))
            }
          />
        </label>

        {/* Not the real popup — this page can't open one, so it's a
         * stand-in built from the same palette/type scale to show
         * relative width as the slider moves. Its height is never set
         * directly, same as the real popup: it grows and shrinks with
         * its own (fake) content instead of being a separate preference.
         * The real popup's on-screen size still ultimately depends on
         * the browser/OS, same unverifiable-by-automation caveat as
         * popupWidth always had. */}
        <div>
          <span>Preview</span>
          <div className="popup-size-preview-wrapper">
            <div
              className="popup-size-preview"
              aria-hidden="true"
              style={{ width: prefs.popupWidth }}
            >
              <strong className="popup-size-preview-title">Aquilifer</strong>
              <ul className="popup-size-preview-providers">
                <li>
                  <div className="popup-size-preview-provider-row">
                    <strong>Personal Claude</strong>
                    <span className="popup-size-preview-provider-type">
                      anthropic
                    </span>
                  </div>
                  <span className="popup-size-preview-provider-model">
                    claude-opus-5
                  </span>
                </li>
                <li>
                  <div className="popup-size-preview-provider-row">
                    <strong>Work OpenAI</strong>
                    <span className="popup-size-preview-provider-type">
                      openai-compatible
                    </span>
                  </div>
                  <span className="popup-size-preview-provider-model">
                    gpt-5
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <label title="Only the toolbar popup's own width — not the connection-approval, rate-limit, or vault-unlock popups, which are separate, transient windows.">
          Popup width ({prefs.popupWidth}px)
          <input
            type="range"
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
