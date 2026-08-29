import { useState } from 'react';
import { getRateLimitSettings, setRateLimitSettings } from '../../lib/rate-limits';

function getOriginFromQuery(): string {
  return new URLSearchParams(window.location.search).get('origin') ?? '';
}

function App() {
  const [origin] = useState(getOriginFromQuery);
  const [disablePopup, setDisablePopup] = useState(false);

  async function close() {
    if (disablePopup) {
      const settings = await getRateLimitSettings();
      await setRateLimitSettings({ ...settings, showPopupOnBlock: false });
    }
    window.close();
  }

  return (
    <main>
      <h1>Rate limit reached</h1>
      <p>
        <strong>{origin}</strong> hit the rate limit and its request was
        blocked.
      </p>
      <label className="checkbox-option">
        <input
          type="checkbox"
          checked={disablePopup}
          onChange={(event) => setDisablePopup(event.target.checked)}
        />
        Disable this popup
      </label>
      <div className="actions">
        <button onClick={close} autoFocus>
          OK
        </button>
      </div>
    </main>
  );
}

export default App;
