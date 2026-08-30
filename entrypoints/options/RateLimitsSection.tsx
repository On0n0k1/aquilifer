import { useEffect, useState, type FormEvent } from 'react';
import {
  DEFAULT_RATE_LIMIT_SETTINGS,
  getRateLimitSettings,
  setRateLimitSettings,
  type RateLimitSettings,
} from '../../lib/rate-limits';

function RateLimitsSection() {
  const [rateLimits, setRateLimits] = useState<RateLimitSettings>(
    DEFAULT_RATE_LIMIT_SETTINGS,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getRateLimitSettings().then(setRateLimits);
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    await setRateLimitSettings(rateLimits);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section>
      <h2>Rate limiting</h2>
      <form onSubmit={handleSave}>
        <label>
          Max requests per origin
          <input
            type="number"
            min={1}
            value={rateLimits.frequencyThreshold}
            onChange={(event) =>
              setRateLimits({
                ...rateLimits,
                frequencyThreshold: Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Per window (minutes)
          <input
            type="number"
            min={1}
            value={rateLimits.frequencyWindowMinutes}
            onChange={(event) =>
              setRateLimits({
                ...rateLimits,
                frequencyWindowMinutes: Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Large-request warning threshold (characters)
          <input
            type="number"
            min={1}
            value={rateLimits.sizeThresholdChars}
            onChange={(event) =>
              setRateLimits({
                ...rateLimits,
                sizeThresholdChars: Number(event.target.value),
              })
            }
          />
        </label>

        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={rateLimits.notifyOnBlock}
            onChange={(event) =>
              setRateLimits({
                ...rateLimits,
                notifyOnBlock: event.target.checked,
              })
            }
          />
          Turn on notification
        </label>

        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={rateLimits.showPopupOnBlock}
            onChange={(event) =>
              setRateLimits({
                ...rateLimits,
                showPopupOnBlock: event.target.checked,
              })
            }
          />
          Show popup
        </label>

        <button type="submit">{saved ? 'Saved' : 'Save limits'}</button>
      </form>
    </section>
  );
}

export default RateLimitsSection;
