import { useEffect, useState, type FormEvent } from 'react';
import { clearHistory, listHistory, type HistoryEntry } from '../../lib/history';
import {
  deleteProvider,
  getDefaultProviderId,
  listProviders,
  originPatternForUrl,
  saveProvider,
  setDefaultProviderId,
  type ProviderConfig,
  type ProviderType,
} from '../../lib/providers';
import {
  DEFAULT_RATE_LIMIT_SETTINGS,
  getRateLimitSettings,
  setRateLimitSettings,
  type RateLimitSettings,
} from '../../lib/rate-limits';
import './style.css';

const WARNING_LABELS: Record<string, string> = {
  large_request: 'large request',
  rate_limited: 'rate limited',
};

interface FormState {
  type: ProviderType;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function emptyForm(): FormState {
  return { type: 'anthropic', label: '', apiKey: '', baseUrl: '', model: '' };
}

function App() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaultProviderId, setDefaultProviderIdState] = useState<
    string | undefined
  >();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimitSettings>(
    DEFAULT_RATE_LIMIT_SETTINGS,
  );
  const [rateLimitsSaved, setRateLimitsSaved] = useState(false);

  useEffect(() => {
    listProviders().then(setProviders);
    listHistory().then(setHistory);
    getDefaultProviderId().then(setDefaultProviderIdState);
    getRateLimitSettings().then(setRateLimits);
  }, []);

  async function handleSaveRateLimits(event: FormEvent) {
    event.preventDefault();
    await setRateLimitSettings(rateLimits);
    setRateLimitsSaved(true);
    setTimeout(() => setRateLimitsSaved(false), 2000);
  }

  async function handleSetDefault(id: string) {
    await setDefaultProviderId(id);
    setDefaultProviderIdState(id);
  }

  async function handleClearHistory() {
    await clearHistory();
    setHistory(await listHistory());
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.label.trim()) {
      setError('Label is required.');
      return;
    }

    setSaving(true);
    try {
      if (form.type === 'anthropic') {
        if (!form.apiKey.trim() || !form.model.trim()) {
          setError('API key and model are required.');
          return;
        }
        await saveProvider({
          id: crypto.randomUUID(),
          type: 'anthropic',
          label: form.label.trim(),
          apiKey: form.apiKey.trim(),
          model: form.model.trim(),
        });
      } else {
        if (!form.baseUrl.trim() || !form.model.trim()) {
          setError('Base URL and model are required.');
          return;
        }

        let originPattern: string;
        try {
          originPattern = originPatternForUrl(form.baseUrl.trim());
        } catch {
          setError('Enter a valid http(s) URL, e.g. http://localhost:8080');
          return;
        }

        // Must run inside this click handler's user gesture — the browser
        // ties permissions.request() to the transient activation from Save.
        const granted = await browser.permissions.request({
          origins: [originPattern],
        });
        if (!granted) {
          setError('Permission for that host was not granted.');
          return;
        }

        await saveProvider({
          id: crypto.randomUUID(),
          type: 'openai-compatible',
          label: form.label.trim(),
          baseUrl: form.baseUrl.trim(),
          apiKey: form.apiKey.trim() || undefined,
          model: form.model.trim(),
        });
      }

      setForm(emptyForm());
      setProviders(await listProviders());
      setDefaultProviderIdState(await getDefaultProviderId());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteProvider(id);
    setProviders(await listProviders());
    setDefaultProviderIdState(await getDefaultProviderId());
  }

  return (
    <main>
      <h1>Aquilifer settings</h1>

      <section>
        <h2>Providers</h2>
        {providers.length === 0 && <p>No providers configured yet.</p>}
        <ul className="provider-list">
          {providers.map((provider) => {
            const isDefault = provider.id === defaultProviderId;
            return (
              <li key={provider.id}>
                <div>
                  <strong>{provider.label}</strong>
                  <span className="provider-type">{provider.type}</span>
                  {isDefault && <span className="provider-default">default</span>}
                  <div className="provider-detail">
                    {provider.type === 'openai-compatible'
                      ? `${provider.baseUrl} (${provider.model})`
                      : provider.model}
                  </div>
                </div>
                <div className="provider-actions">
                  {!isDefault && (
                    <button onClick={() => handleSetDefault(provider.id)}>
                      Set default
                    </button>
                  )}
                  <button onClick={() => handleDelete(provider.id)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Rate limiting</h2>
        <form onSubmit={handleSaveRateLimits}>
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

          <button type="submit">
            {rateLimitsSaved ? 'Saved' : 'Save limits'}
          </button>
        </form>
      </section>

      <section>
        <div className="section-header">
          <h2>History</h2>
          {history.length > 0 && (
            <button onClick={handleClearHistory}>Clear all</button>
          )}
        </div>
        {history.length === 0 && <p>No requests yet.</p>}
        <ul className="history-list">
          {[...history]
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((entry) => {
              const lastMessage = entry.messages[entry.messages.length - 1];
              return (
                <li key={entry.id}>
                  <div className="history-meta">
                    <strong>{entry.origin}</strong>
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    <span>{entry.providerLabel}</span>
                  </div>
                  {entry.warnings && entry.warnings.length > 0 && (
                    <div className="history-warnings">
                      {entry.warnings.map((warning) => (
                        <span key={warning} className="warning-tag">
                          ⚠ {WARNING_LABELS[warning] ?? warning}
                        </span>
                      ))}
                    </div>
                  )}
                  {lastMessage && (
                    <div className="history-prompt">
                      {lastMessage.role}: {lastMessage.content}
                    </div>
                  )}
                  <div
                    className={
                      entry.outcome.ok ? 'history-result' : 'history-error'
                    }
                  >
                    {entry.outcome.ok ? entry.outcome.message : entry.outcome.error}
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section>
        <h2>Add provider</h2>
        <form onSubmit={handleSave}>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as ProviderType })
              }
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai-compatible">
                OpenAI-compatible (local/self-hosted)
              </option>
            </select>
          </label>

          <label>
            Label
            <input
              value={form.label}
              onChange={(event) =>
                setForm({ ...form, label: event.target.value })
              }
              placeholder="e.g. Claude home"
            />
          </label>

          {form.type === 'anthropic' ? (
            <>
              <label>
                Model
                <input
                  value={form.model}
                  onChange={(event) =>
                    setForm({ ...form, model: event.target.value })
                  }
                  placeholder="e.g. claude-sonnet-5"
                />
              </label>
              <label>
                API key
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) =>
                    setForm({ ...form, apiKey: event.target.value })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Base URL
                <input
                  value={form.baseUrl}
                  onChange={(event) =>
                    setForm({ ...form, baseUrl: event.target.value })
                  }
                  placeholder="http://localhost:8080"
                />
              </label>
              <label>
                Model
                <input
                  value={form.model}
                  onChange={(event) =>
                    setForm({ ...form, model: event.target.value })
                  }
                  placeholder="e.g. llama-3"
                />
              </label>
              <label>
                API key (optional)
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) =>
                    setForm({ ...form, apiKey: event.target.value })
                  }
                />
              </label>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save provider'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;
