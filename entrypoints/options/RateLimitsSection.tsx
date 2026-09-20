import { type FormEvent, useEffect, useState } from 'react';
import {
  DEFAULT_RATE_LIMIT_SETTINGS,
  type FrequencyLimit,
  getRateLimitSettings,
  type RateLimitInterface,
  type RateLimitSettings,
  setRateLimitSettings,
} from '../../lib/rate-limits';

const INTERFACE_LABELS: Record<RateLimitInterface, string> = {
  generic: 'Generic chat',
  anthropicMessages: 'Anthropic Messages',
  openaiChatCompletions: 'OpenAI Chat Completions',
};

interface FrequencyFieldsProps {
  legend: string;
  value: FrequencyLimit;
  onChange: (value: FrequencyLimit) => void;
}

function FrequencyFields({ legend, value, onChange }: FrequencyFieldsProps) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <label>
        Max requests
        <input
          type="number"
          min={1}
          value={value.threshold}
          onChange={(event) =>
            onChange({ ...value, threshold: Number(event.target.value) })
          }
        />
      </label>
      <label>
        Per window (minutes)
        <input
          type="number"
          min={1}
          value={value.windowMinutes}
          onChange={(event) =>
            onChange({ ...value, windowMinutes: Number(event.target.value) })
          }
        />
      </label>
    </fieldset>
  );
}

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
        <FrequencyFields
          legend="Global (all interfaces combined)"
          value={rateLimits.global}
          onChange={(global) => setRateLimits({ ...rateLimits, global })}
        />

        {(Object.keys(rateLimits.perInterface) as RateLimitInterface[]).map(
          (interfaceName) => (
            <FrequencyFields
              key={interfaceName}
              legend={INTERFACE_LABELS[interfaceName]}
              value={rateLimits.perInterface[interfaceName]}
              onChange={(limit) =>
                setRateLimits({
                  ...rateLimits,
                  perInterface: {
                    ...rateLimits.perInterface,
                    [interfaceName]: limit,
                  },
                })
              }
            />
          ),
        )}

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

        <label title="Minimum time between block alerts (notification/popup) for the same site — a site retrying right after being blocked won't re-alert you on every single retry. Doesn't affect the block itself, only how often you're notified about it.">
          Minimum seconds between block alerts
          <input
            type="number"
            min={0}
            value={rateLimits.blockAlertCooldownSeconds}
            onChange={(event) =>
              setRateLimits({
                ...rateLimits,
                blockAlertCooldownSeconds: Number(event.target.value),
              })
            }
          />
        </label>

        <label
          className="checkbox-option"
          title="Show a browser notification whenever a request gets blocked by your rate limit."
        >
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

        <label
          className="checkbox-option"
          title="Open a small popup window whenever a request gets blocked by your rate limit."
        >
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
